@p2 @mcp
Feature: MCP server management
  As a user
  I want to manage MCP servers from the UI
  So tools work without CLI steps

  Scenario: List MCP servers
    When I open the MCP panel
    Then I see available MCP servers and auth status

  Scenario: Add MCP server
    When I add an MCP server
    Then the server appears in the list

  Scenario: Remove MCP server
    Given an MCP server exists
    When I remove the server
    Then it is removed from the list

  Scenario: Login and logout MCP server
    Given an MCP server requires auth
    When I login to the server
    Then auth status is updated
    When I logout of the server
    Then auth status is cleared
