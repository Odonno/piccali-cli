Feature: Search reset

  Background:
    Given the following dealer contracts:
      | vin               | company name         |
      | 1HGCM82633A004352 | RAINBOW MOTORS INC   |
      | 2T1BURHE0JC043821 | CENTRAL AUTO GROUP   |
    And the company "CENTRAL AUTO GROUP" has the following branches:
      | Branch               | address1           | address2                 | address3  | address4 | zip code | city        |
      | Central Auto Midwest | LLC                | 22 Industrial Boulevard  | PO Box 12 | SUITE    | 60601    | Chicago     |
      | Central Auto South   | 8 Commerce Street  |                          |           |          | 30301    | Atlanta     |
    And the company "RAINBOW MOTORS INC" has the following branches:
      | Branch              | address1 | address2                 | address3  | address4 | zip code | city        |
      | Rainbow Fleet Depot | LLC      | 23 Industrial Boulevard  | PO Box 12 | SUITE    | 60601    | Chicago     |

  @feat:25360
  Scenario: I search by dealer name then reset the search
    Given I am a user on the home page
    And I search by dealer name "CENTRAL AUTO GROUP"
    When I reset the search
    Then the dealer name field is empty
    And the results table is not visible

  @feat:25360
  Scenario: I search by VIN then reset the search
    Given I am a user on the home page
    And I search by VIN "01010101010"
    When I reset the search
    Then the VIN field is empty
    And the results table is not visible
