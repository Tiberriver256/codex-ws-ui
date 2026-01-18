@p3 @reasoning
Feature: Reasoning display toggles
  As a user
  I want to control reasoning visibility
  So I can reduce noise when needed

  Scenario: Hide reasoning messages
    When I toggle reasoning off
    Then reasoning messages are hidden

  Scenario: Show raw reasoning when available
    Given raw reasoning is available
    When I toggle raw reasoning on
    Then raw reasoning is shown
