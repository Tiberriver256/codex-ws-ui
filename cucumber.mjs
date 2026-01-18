export default {
  default: {
    paths: [
      'features/core-chat.feature',
      'features/app-server.feature',
      'features/threading.feature',
      'features/connection-status.feature',
      'features/models.feature',
      'features/config-profiles.feature',
      'features/thread-options-basic.feature',
      'features/approvals.feature',
      'features/status-panel.feature',
      'features/auth.feature',
      'features/sessions.feature',
      'features/mcp.feature',
      'features/structured-output.feature',
      'features/images.feature',
      'features/command-palette.feature',
      'features/prompts.feature',
      'features/mentions.feature',
      'features/review-apply.feature',
    ],
    import: [
      'features/step-definitions/**/*.mjs',
      'features/support/**/*.mjs',
    ],
    format: [
      'progress',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json',
    ],
    publishQuiet: true,
    parallel: 1,
    worldParameters: {
      baseURL: process.env.BASE_URL || 'http://127.0.0.1:8080',
      mock: process.env.CODEX_MOCK || '1',
    },
  },
};
