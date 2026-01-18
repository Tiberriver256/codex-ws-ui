@p2 @review
Feature: Review and apply workflows
  As a user
  I want review and apply flows
  So I can inspect and accept changes

  Scenario: Review changes
    Given there are local changes
    When I run review
    Then I see a summary of changes

  Scenario: Apply latest diff
    Given a latest diff exists
    When I apply the diff
    Then I must confirm before applying
    And the apply result is shown
