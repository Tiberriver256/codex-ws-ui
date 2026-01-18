@p0 @thread-options
Feature: Thread options basics
  As a user
  I want to configure key thread options
  So I can control context and safety settings

  Background:
    Given the app is running in mock mode
    And I am connected

  Scenario: New thread with core options shows summary
    When I open new thread options
    And I set model to "gpt-test-model-lite"
    And I set sandbox mode to "read-only"
    And I enable network access
    And I enable web search
    And I create the thread
    Then I see a thread options set message
    And the thread options summary shows "Model: gpt-test-model-lite"
    And the thread options summary shows "Sandbox: read-only"
    And the thread options summary shows "Network: on"
    And the thread options summary shows "Search: on"

  Scenario: Update thread options mid-thread
    Given I have an active thread
    When I open thread settings
    And I set approval policy to "on-request"
    And I apply thread settings
    Then I see a thread options updated message
    And the thread options summary shows "Approval: on-request"
