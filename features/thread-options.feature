@p0 @thread-options
Feature: Thread options UX
  As a user
  I want clear, safe thread configuration
  So I can control risk and context per thread

  Background:
    Given I am connected

  Scenario: New thread uses defaults
    When I open new thread options
    And I create the thread without changes
    Then the thread header shows default settings

  Scenario: New thread with full customization
    When I open new thread options
    And I set model to "gpt-test-model-lite"
    And I set reasoning effort to "high"
    And I set sandbox mode to "workspace-write"
    And I enable network access
    And I enable web search
    And I set working directory to a valid path
    And I add two additional directories
    And I enable skip git repo check
    And I create the thread
    Then the thread summary reflects all selected settings

  Scenario: Web search requires network access
    When I open new thread options
    And I disable network access
    And I attempt to enable web search
    Then web search stays disabled or network is auto-enabled with confirmation

  Scenario: Invalid working directory is blocked
    When I open new thread options
    And I set working directory to an invalid path
    Then I see a validation error
    And I cannot apply the options

  Scenario: Additional directories add and remove
    When I open new thread options
    And I add two additional directories
    And I remove one additional directory
    And I create the thread
    Then only the remaining directory is saved

  Scenario: Mid-thread model and reasoning change
    Given I have an active thread
    When I open thread settings
    And I change model and reasoning effort
    And I apply thread settings
    Then a settings changed marker appears with both fields

  Scenario: Sandbox escalation requires confirmation
    Given I have an active thread with sandbox "read-only"
    When I open thread settings
    And I set sandbox mode to "danger-full-access"
    Then I must confirm the risk before applying

  Scenario: Network off blocks network actions
    Given I have an active thread with network access enabled
    When I disable network access
    And I attempt a network-required action
    Then I see a blocking prompt to re-enable or cancel

  Scenario: Approval policy on-request prompts for approval
    Given I have an active thread
    When I set approval policy to "on-request"
    And I attempt an action requiring approval
    Then an approval request is shown in the timeline

  Scenario: Skip git repo check toggles safely
    Given I have an active thread in a git repo
    When I enable skip git repo check
    Then repo checks are bypassed and the change is recorded

  Scenario: Restricted options are disabled
    Given my permissions restrict dangerous settings
    When I open thread settings
    Then restricted controls are disabled with an explanation

  Scenario: Settings persist across reload
    Given I have a thread with custom settings
    When I reload the app
    Then the thread settings match the previous values

  Scenario: Thread list indicators reflect settings
    Given I have two threads with different network and search settings
    When I view the thread list
    Then each thread shows the correct badges

  Scenario: Use defaults resets fields
    When I open new thread options
    And I change multiple settings
    And I choose "Use defaults"
    Then all fields return to defaults
