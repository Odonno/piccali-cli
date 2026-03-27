Feature: Driver search feature flag

  Scenario: Driver search is disabled
    Given the driver search is disabled
    When I am on the search page
    Then no search is selected
    And the driver search is not displayed

  Scenario: Driver search is enabled
    Given the driver search is enabled
    When I am on the search page
    Then the dealer search is not selected
    And the driver search is displayed
