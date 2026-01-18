@p0 @approvals
Feature: Approvals and execpolicy
  As a user
  I want approval prompts when actions are risky
  So I stay in control

  Scenario: Approval prompt appears for risky action
    Given approval policy is "on-request"
    When an action requires approval
    Then I see an approval request with details

  Scenario: Approve action
    Given an approval request is shown
    When I approve the request
    Then the action proceeds and the timeline records approval

  Scenario: Deny action
    Given an approval request is shown
    When I deny the request
    Then the action is canceled and the timeline records denial

  Scenario: Always allow action
    Given an approval request is shown
    When I choose "Always allow"
    Then a rule is added and future actions proceed without prompts

  Scenario: Execpolicy rules preview
    When I open execpolicy rules
    Then I can view rules and preview a check

  Scenario: Approval presets
    When I choose a preset
    Then sandbox and approval settings update together
