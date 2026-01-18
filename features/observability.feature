@p3 @observability
Feature: Export and logs
  As a user
  I want exports and logs
  So I can audit and share runs

  Scenario: Export JSONL transcript
    Given a session has completed
    When I export the transcript
    Then I receive a JSONL file

  Scenario: View logs
    When I open the logs viewer
    Then I can read logs from ~/.codex/log

  Scenario: Browser notifications
    Given notifications are enabled
    When a turn completes or approval is needed
    Then I receive a browser notification
