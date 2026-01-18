@p0 @core
Feature: Core chat rendering
  As a user
  I want the timeline to show all core message types
  So I can follow the full turn lifecycle

  Background:
    Given the app is running in mock mode
    And I am connected

  Scenario: Assistant response appears after sending a prompt
    When I send "Hello"
    Then I see an assistant message with content
    And the assistant message includes "Hello!"

  Scenario: Reasoning message is visible
    When I send "Hello"
    Then I see a reasoning message
    And the reasoning message includes "analyzing"

  Scenario: Todo list updates are visible
    When I send "Hello"
    Then I see a todo list update

  Scenario: Usage stats appear after turn completion
    When I send "Hello"
    Then I see a usage message
    And the usage message includes "Tokens"

  Scenario: Command execution output is shown
    When I send "Please run npm install"
    Then I see a command execution message
    And the command execution includes "npm install"
    And the command execution includes "exit: 0"

  Scenario: File change events are shown with a diff
    When I send "Create a new file called test.js"
    Then I see a file change message
    And the file change includes a unified diff

  Scenario: Assistant text streams progressively
    When I send "Hello"
    Then I see the assistant message stream in
    And the final assistant message has content

  Scenario: User message formatting is preserved
    When I send "Hello world"
    Then I see a user message starting with "> "
