Feature: Search results for a driver search

  @feat:20824
  Scenario: I search for drivers and the results table appears
    Given a driver search returns the following people
      | id   | lastName | firstName | dateOfBirth | zipCode | role              | company                    |
      | 1548 | Johnson  | Michael   | 01/08/1979  | 10001   | Primary Driver    | FastWheels LLC             |
      | 1549 | Johnson  | Michael   | 01/08/1979  | 90001   |                   | SpeedDrive Corporation     |
      | 1547 | Johnson  | Michael   | 01/08/1979  | 30301   | Fleet Manager     | AutoNation Group           |
    Given I perform a driver search
    And I type "Johnson" in the last name field
    And I type "Michael" in the first name field
    And I type "01/08/1979" in the date of birth field
    When I search for this driver
    Then the following results are displayed
      | Last Name | First Name | Date of Birth | Zip Code | Contract Role (DSN) | Company Name               |
      | Johnson   | Michael    | 01/08/1979    | 10001    | Primary Driver      | FastWheels LLC             |
      | Johnson   | Michael    | 01/08/1979    | 90001    |                     | SpeedDrive Corporation     |
      | Johnson   | Michael    | 01/08/1979    | 30301    | Fleet Manager       | AutoNation Group           |
    And the result indicates "3 drivers found"

  @feat:20824
  Scenario: I search for drivers and no results are returned
    Given a driver search returns no results
    Given I perform a driver search
    And I type "Johnson" in the last name field
    And I type "Michael" in the first name field
    And I type "01/08/1979" in the date of birth field
    When I search for this driver
    Then a message indicates "Your search returned no results"
