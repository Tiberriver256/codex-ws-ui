@p0 @app-server
Feature: App-server protocol integration
  As a system
  I want stable JSON-RPC integration
  So the UI can mirror CLI behavior

  Scenario: Initialize JSON-RPC session
    When the UI connects to app-server
    Then the initialize request succeeds

  Scenario: Handle numeric request ids including 0
    Given a request uses id 0
    When a response is received
    Then it is matched to the correct request

  Scenario: Normalize mixed notification streams
    Given app-server sends mixed notifications
    When events are received
    Then they are normalized into the UI event model

  Scenario: Stream diff updates
    Given a file change occurs
    When app-server emits diff updates
    Then the UI renders the updated diff
