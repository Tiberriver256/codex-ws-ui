@p0 @auth
Feature: Authentication flows
  As a user
  I want to manage authentication in the UI
  So I can sign in without the CLI

  Scenario: OAuth login
    When I choose auth option "Login"
    Then I am guided through OAuth
    And login status reflects success

  Scenario: API key login
    When I choose auth option "Login with API key"
    And I submit a valid API key
    Then login status reflects success

  Scenario: Device auth
    When I choose auth option "Device auth"
    Then I see device auth instructions
    And login status reflects success after completion

  Scenario: Login status panel
    Given I am logged in
    When I open the status panel
    Then I see current auth state and workspace

  Scenario: Logout
    Given I am logged in
    When I choose auth option "Logout"
    Then I am logged out and status updates

  Scenario: Headless guidance
    Given I am in a headless environment
    When I choose auth option "Login"
    Then I see copyable port-forward guidance
