// OpenTelemetry bootstrap for the Angular SSR server.
//
// Loaded ahead of the app with `node --import ./otel/instrumentation.mjs`, so
// the http instrumentation is in place before server.mjs imports node:http.
// Exports go over OTLP/HTTP to OTEL_EXPORTER_OTLP_ENDPOINT (the SigNoz
// collector in production). Without that variable this file does nothing,
// so `bun run serve` locally stays quiet.
//
// Express is bundled into server.mjs rather than imported from node_modules,
// so the express instrumentation never sees it: expect one HTTP server span
// per request, not per-middleware spans. Outbound fetch() calls from SSR to
// the API are traced by the undici instrumentation and carry traceparent, so
// a page render and the backend calls it triggers join into one trace.
import { register } from 'node:module';
import process from 'node:process';

const endpoint =
  process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ||
  process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'];

if (endpoint) {
  // ESM loader hook: lets the instrumentations patch modules loaded with
  // `import`, which the CommonJS require hook alone cannot see.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const [
    { NodeSDK },
    { getNodeAutoInstrumentations },
    { OTLPTraceExporter },
    { OTLPMetricExporter },
    { PeriodicExportingMetricReader },
    { resourceFromAttributes },
    { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
  ] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/auto-instrumentations-node'),
    import('@opentelemetry/exporter-trace-otlp-proto'),
    import('@opentelemetry/exporter-metrics-otlp-proto'),
    import('@opentelemetry/sdk-metrics'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/semantic-conventions'),
  ]);

  const sdk = new NodeSDK({
    // Both spellings of the environment attribute: the current semconv name
    // and the older deployment.environment that SigNoz's span metrics key
    // on to split production from staging.
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] || 'portfolio-frontend',
      [ATTR_SERVICE_VERSION]: process.env['APP_VERSION'] || 'dev',
      'deployment.environment.name': process.env['DEPLOY_ENV'] || 'local',
      'deployment.environment': process.env['DEPLOY_ENV'] || 'local',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Static asset requests are served by express.static and would drown
        // the page-render spans; nginx access logs already cover them.
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) =>
            /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|txt|xml|json)$/i.test(
              req.url ?? '',
            ),
        },
        // Noisy at the level of individual fs calls during SSR.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk
      .shutdown()
      .catch((error) => console.error('otel shutdown failed', error))
      .finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
