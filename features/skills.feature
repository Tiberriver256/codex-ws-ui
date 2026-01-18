@p2 @skills
Feature: Skills discovery
  As a user
  I want to discover skills
  So I can insert guided workflows

  Scenario: Discover skills
    Given skills exist in ~/.codex/skills
    When I open the skills palette
    Then I see available skills

  Scenario: Insert a skill into the prompt
    Given a skill is selected
    When I insert the skill
    Then the prompt is populated with the skill content
