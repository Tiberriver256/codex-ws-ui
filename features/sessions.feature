@p0 @sessions
Feature: Sessions and resume
  As a user
  I want to resume past sessions
  So long-running work continues seamlessly

  Scenario: List sessions in current workspace
    Given sessions exist for this workspace
    When I open the session picker
    Then I see sessions with id, cwd, branch, and last run

  Scenario: Resume by session id
    Given a session exists
    When I resume the session by id
    Then the session loads and the thread is active

  Scenario: Resume last session
    Given I have a previous session
    When I choose resume last
    Then the most recent session is restored

  Scenario: Show all sessions across workspaces
    Given sessions exist in other workspaces
    When I enable show all sessions
    Then the session picker includes them

  Scenario: Exec-mode resume last
    Given I want to run a prompt on the last session
    When I run exec resume last with a new prompt
    Then the session resumes and the prompt runs

  Scenario: Session metadata persists locally
    Given I update thread options or metadata
    When I return to the session list
    Then the metadata is preserved
