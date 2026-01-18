@p1 @mentions
Feature: File mention search
  As a user
  I want @-mentions for files
  So I can reference code quickly

  Scenario: Mention search opens on @
    When I type "@" in the prompt
    Then a file search list appears

  Scenario: Mention search uses workspace files
    Given the workspace contains files
    When I search for a filename
    Then matching files are shown

  Scenario: Insert mention into prompt
    Given the file search list is open
    When I select a file
    Then the file path is inserted into the prompt
