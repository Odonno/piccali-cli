Feature: Search results filtering

  @feat:22192
  Scenario: 5 rows in the table
    Given a parent company "Apex Motors" with a legal contract "Contract 1"
    Given a parent company "AutoPeak" with a legal contract "Contract 2"
    Given a parent company "Apextra Cars" with a legal contract "Contract 3"
    Given a parent company "APEX Drive" with a legal contract "Contract 4"
    And a branch "APEX CONSULTING HUB" with a sub-contract "2281804540001" active linked to legal contract "Contract 1"
    And a branch "APEX SOUTH BRANCH" with a sub-contract "2281804540020" terminated linked to legal contract "Contract 1"
    And a branch "APEX NORTH BRANCH" with a sub-contract "2281804540001" active linked to legal contract "Contract 1"
    When I am on the search page
    And I search "Apex"
    Then the following results are displayed
      | Company Name        | VIN | Scope  | Address | Zip Code | City |
      | AutoPeak            |     | Parent |         |          |      |
      | Apextra Cars        |     | Parent |         |          |      |
      | APEX Drive          |     | Parent |         |          |      |
      | Apex Motors         |     | Parent |         |          |      |
      | APEX NORTH BRANCH   |     | Branch |         |          |      |
