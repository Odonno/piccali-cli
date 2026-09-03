Feature: Page /other

  Scenario: Other page
    When I search "other"
    Then I am redirected to "/other" page
