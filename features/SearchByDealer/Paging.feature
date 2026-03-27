Feature: Search results pagination

  Background:
    Given the following dealer contracts:
      | vin               | company name       |
      | 2T1BURHE0JC043821 | CENTRAL AUTO GROUP |
    And the company "CENTRAL AUTO GROUP" has "233" branches
    And I am a user on the home page

  @fix:33070
  Scenario: 10 items per page by default
    When I search "central"
    Then the results are displayed with "10" items per page
    And I see "10" rows in the results table

  @fix:33070
  Scenario Outline: I change the number of results to see <itemsPerPage> items per page
    When I search "central"
    And I want to display "<itemsPerPage>" items per page
    And I see "<itemsPerPage>" rows in the results table

    Examples:
      | itemsPerPage |
      | 5            |
      | 25           |
      | 50           |
      | 100          |

  @fix:33070
  Scenario: Go to the next page
    When I search "central"
    And I want to display "5" items per page
    And I go to the next page
    Then the results are displayed with "5" items per page
    And I see "5" rows in the results table
