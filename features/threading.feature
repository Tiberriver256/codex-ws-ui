@p0 @threads
Feature: Thread lifecycle and concurrency
  As a user
  I want threads to be stable and isolated
  So multi-turn work stays consistent

  Background:
    Given the app is running in mock mode
    And I am connected

  Scenario: Reuse the same thread for multiple messages
    When I send "First message"
    And I send "Second message"
    Then both messages use the same thread id

  Scenario: Pending thread id is replaced after first turn
    Given I create a new thread with options
    When I send "Kick off the new thread"
    Then the pending thread id is replaced with a real id

  Scenario: Thread started message is not repeated per turn
    When I send "First message same thread"
    And I send "Second message same thread"
    Then I see only one "Thread started" message

  Scenario: Concurrent messages render without overwrite
    When I send "First concurrent message"
    And I send "Second concurrent message"
    Then I see two assistant messages
    And each assistant message matches its prompt

  Scenario: Multiple threads are supported
    When I send "Hello from thread 1"
    And I create a new thread with options
    Then the thread selector shows two threads
    And the new thread starts with minimal messages
