@p0 @status
Feature: Session status and context visibility
  As a user
  I want a compact status view
  So I can understand the active configuration

  Scenario: Session status card shows core settings
    Given a session is active
    When I open the status card
    Then I see model, sandbox, approvals, cwd, add-dirs, and tokens

  Scenario: AGENTS discovery path is visible
    Given a session is active
    When I open the status card
    Then I see the AGENTS discovery path and active instructions
