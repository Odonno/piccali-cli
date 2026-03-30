@user-data

@validation
@date-of-birth

@feat:20824
Feature: Date of birth validation

  @date @feat:20824
  Scenario Outline: I type an invalid date of birth and the help message shows an error: <Case>
    Given today's date is 10/03/2020
    Given I perform a driver search
    When I type <Value> in the date of birth field
    And I leave the date of birth field
    Then I have an error on the date of birth field

    Examples:
      | Case                      | Value      |
      | wrong format #1           | 01/10      |
      | wrong format #2           | 01-01-2020 |
      | invalid date #1           | 30/02/1980 |
      | date in the future        | 11/03/2020 |
      | date too far in the past  | 31/12/1899 |

  @date @feat:20824
  Scenario Outline: I type a valid date of birth and the help message does not show an error: <Case>
    Given today's date is 07/03/2022
    And I perform a driver search
    When I type <Value> in the date of birth field
    And I leave the date of birth field
    Then I have no error on the date of birth field

    Examples:
      | Case         | Value      |
      | lower limit  | 01/01/1900 |
      | today's date | 07/03/2022 |
