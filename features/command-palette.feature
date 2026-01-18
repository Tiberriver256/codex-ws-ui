@p1 @commands
Feature: Command palette and slash commands
  As a user
  I want a command palette similar to the CLI
  So I can access power features quickly

  Scenario: Open command palette
    When I open the command palette
    Then I see available commands

  Scenario: Run /model
    When I run the "/model" command
    Then the model selector is shown

  Scenario: Run /status
    When I run the "/status" command
    Then the status panel is shown

  Scenario: Run /new and /resume
    When I run the "/new" command
    Then a new thread is created
    When I run the "/resume" command
    Then the session picker is shown

  Scenario: Run /diff
    Given there are local changes
    When I run the "/diff" command
    Then a diff viewer panel appears

  Scenario: Run /review and /apply
    Given there are local changes
    When I run the "/review" command
    Then a review summary is displayed
    When I run the "/apply" command
    Then I am asked to confirm apply

  Scenario: Advanced sections remain collapsed by default
    When I open the command palette
    Then advanced sections are collapsed
