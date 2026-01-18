@p2 @cloud
Feature: Cloud tasks
  As a user
  I want to run cloud tasks from the UI
  So I can manage remote work without the CLI

  Scenario: List cloud tasks
    When I open the cloud tasks panel
    Then I see available tasks

  Scenario: Run a cloud task
    Given a cloud task is available
    When I run the task
    Then I see task status updates
