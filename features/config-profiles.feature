@p1 @config
Feature: Profiles, providers, and feature flags
  As a user
  I want profile and provider controls
  So I can select effective config quickly

  Scenario: Profile selection and preview
    When I choose a profile
    Then I see the effective config preview

  Scenario: Provider selection
    When I choose a model provider or OSS provider
    Then the selection is reflected in thread options

  Scenario: Feature flags list and toggle
    When I open the feature flags panel
    Then I can enable or disable flags
