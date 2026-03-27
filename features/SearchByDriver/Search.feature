Feature: Search by driver

  @feat:20824
  Scenario: The search button activates when last name, first name and date of birth are entered
    Given today's date is 09/08/2015
    And I perform a driver search
    When I type "a" in the last name field
    And I type "a" in the first name field
    And I type "a" in the date of birth field
    Then the "Search" button is enabled

  @feat:20824
  Scenario Outline: The search button does not activate when last name, first name or date of birth is missing
    Given today's date is 09/08/2015
    And I perform a driver search
    When I type "<lastName>" in the last name field
    And I type "<firstName>" in the first name field
    And I type "<dateOfBirth>" in the date of birth field
    Then the "Search" button is disabled
    Examples:
      | lastName   | firstName | dateOfBirth |
      |            | Miller    | 01/01/1980  |
      | Thompson   |           | 01/01/1980  |
      | Thompson   | Miller    |             |

  @feat:20824
  Scenario: I reset the search and the results disappear and the fields are cleared
    Given I perform a driver search
    And I type "Johnson" in the last name field
    And I type "Michael" in the first name field
    And I type "01/08/1979" in the date of birth field
    When I search for this driver
    And I reset the search
    Then the result indicates "No search performed"
    And the results table disappears
    And the last name field is empty
    And the first name field is empty
    And the date of birth field is empty
