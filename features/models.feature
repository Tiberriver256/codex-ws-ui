@p0 @models
Feature: Model selection and catalog
  As a user
  I want a reliable model list and selection flow
  So I can choose the right model per thread

  Background:
    Given the app is running in mock mode
    And I am connected

  Scenario: Model list is populated from catalog
    When I open new thread options
    Then the model list includes the default models

  Scenario: Model selection appears in thread summary
    When I create a new thread with model "gpt-test-model-lite"
    Then the thread options summary shows the selected model

  Scenario: Reasoning effort can be set per thread
    When I create a new thread with reasoning effort "high"
    Then the thread options summary shows the reasoning effort
