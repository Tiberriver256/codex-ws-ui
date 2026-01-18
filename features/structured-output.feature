@p0 @structured
Feature: Structured output
  As a user
  I want JSON schema output
  So I can consume structured results

  Scenario: Set schema per turn
    When I provide a JSON schema for the next turn
    Then the request includes the schema

  Scenario: Render structured output
    Given the model returns structured output
    Then I see a JSON viewer

  Scenario: Copy and download structured output
    Given structured output is shown
    When I choose copy or download
    Then the JSON is copied or saved
