@p0 @status
Feature: Connection and mode indicators
  As a user
  I want clear connection and mode status
  So I know the UI is ready

  Background:
    Given the app is running in mock mode

  Scenario: Connected status is shown
    When I open the app
    Then the status indicator shows "Connected"

  Scenario: Mock mode badge is visible
    When I open the app
    Then I see the mock mode badge
