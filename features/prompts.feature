@p1 @prompts
Feature: Custom prompts
  As a user
  I want to reuse prompt templates
  So I can run common tasks quickly

  Scenario: Prompt discovery
    Given prompts exist in ~/.codex/prompts
    When I open the prompt palette
    Then I see the prompts listed

  Scenario: Positional placeholders
    Given a prompt with positional placeholders
    When I run the prompt
    Then I am asked to fill each placeholder

  Scenario: Named placeholders
    Given a prompt with named placeholders
    When I run the prompt
    Then I can fill placeholders by name

  Scenario: Name collision handling
    Given two prompts with the same name
    When I open the prompt palette
    Then only one is shown but both are invocable

  Scenario: Reload prompts on new session
    Given I create a new session
    When I open the prompt palette
    Then the latest prompts are loaded
