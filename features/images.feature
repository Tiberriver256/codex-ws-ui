@p0 @images
Feature: Image inputs
  As a user
  I want to attach images to prompts
  So the model can see visual context

  Scenario: Attach image via file picker
    When I attach an image file
    Then the image appears as a thumbnail

  Scenario: Attach image via drag and drop
    When I drag and drop an image file
    Then the image appears as a thumbnail

  Scenario: Send text and image together
    When I send a prompt with text and an image
    Then the request includes both text and local_image inputs
