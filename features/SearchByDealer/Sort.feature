Feature: Search results sorting

  Rule: Default sort is by relevance.
    @feat:21724
    Scenario: Default sort
      Given the following dealer contracts:
        | vin    | company name                   |
        | Vin1   | RIVERDALE AUTO CENTER          |
        | Vin2   | RIVERSTONE FLEET SERVICES      |
        | Vin3   | RIVER VALLEY MOTORS            |
        | Vin4   | RIVERSIDE CAR WHOLESALE        |
        | Vin5   | RIVERTON AUTO IMPORTS          |
      And the company "RIVERDALE AUTO CENTER" has the following branches:
        | Branch                 |
        | PREMIER AUTO RIVERDALE |
        | Car RIVERDALE          |
        | Autohaus               |
      And the company "RIVERSTONE FLEET SERVICES" has the following branches:
        | Branch              |
        | RIVER FLEET NORTH   |
        | F RIVERTON          |
      And the company "RIVER VALLEY MOTORS" has the following branches:
        | Branch              |
        | RIVER VALLEY MOTORS |
      And the company "RIVERSIDE CAR WHOLESALE" has the following branches:
        | Branch               |
        | RIVERSIDE WHOLESALE  |
        | AutoGroup            |
        | Westfield            |
      And the company "RIVERTON AUTO IMPORTS" has the following branches:
        | Branch           |
        | MOTORWAY SA      |
        | DELTA AUTOMOTIVE |
      And I am a user on the home page
      When I search "Rive"
      And I display 25 items per page
      Then the following results are displayed
        | Company Name                   | VIN  | Scope  | Address | Zip Code | City |
        | RIVERDALE AUTO CENTER          | Vin1 | Parent |         |          |      |
        | Car RIVERDALE                  |      | Branch |         |          |      |
        | PREMIER AUTO RIVERDALE         |      | Branch |         |          |      |
        | Autohaus                       |      | Branch |         |          |      |
        | RIVERSIDE CAR WHOLESALE        | Vin4 | Parent |         |          |      |
        | RIVERSIDE WHOLESALE            |      | Branch |         |          |      |
        | AutoGroup                      |      | Branch |         |          |      |
        | Westfield                      |      | Branch |         |          |      |
        | RIVERSTONE FLEET SERVICES      | Vin2 | Parent |         |          |      |
        | RIVER FLEET NORTH              |      | Branch |         |          |      |
        | F RIVERTON                     |      | Branch |         |          |      |
        | RIVERTON AUTO IMPORTS          | Vin5 | Parent |         |          |      |
        | DELTA AUTOMOTIVE               |      | Branch |         |          |      |
        | MOTORWAY SA                    |      | Branch |         |          |      |
        | RIVER VALLEY MOTORS            | Vin3 | Parent |         |          |      |
        | RIVER VALLEY MOTORS            |      | Branch |         |          |      |


  Rule: Can sort by company name, parents first then branches
    @feat:21696
    Scenario: Sort by company name ascending
      Given the following dealer contracts:
        | vin    | company name    | zip code |
        | Vin1   | Apex Motors     | 10001    |
        | Vin2   | AutoPeak        | 92600    |
        | Vin3   | Apextra Cars    | 75000    |
        | Vin4   | APEX Drive      | 91100    |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      And I search "Apex"
      And I display 10 items per page
      And I sort by company name
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | APEX Drive          | Vin4 | Parent |              | 91100    |                    |
        | Apex Motors         | Vin1 | Parent |              | 10001    |                    |
        | Apextra Cars        | Vin3 | Parent |              | 75000    |                    |
        | AutoPeak            | Vin2 | Parent |              | 92600    |                    |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |

    @feat:21696
    Scenario: Sort by company name descending
      Given the following dealer contracts:
        | vin    | company name    | zip code |
        | Vin1   | Apex Motors     | 10001    |
        | Vin2   | AutoPeak        | 92600    |
        | Vin3   | Apextra Cars    | 75000    |
        | Vin4   | APEX Drive      | 91100    |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      And I search "Apex"
      And I display 10 items per page
      And I sort by company name
      And I sort by company name
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | Apex Motors         | Vin1 | Parent |              | 10001    |                    |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |
        | APEX Drive          | Vin4 | Parent |              | 91100    |                    |
        | Apextra Cars        | Vin3 | Parent |              | 75000    |                    |
        | AutoPeak            | Vin2 | Parent |              | 92600    |                    |


  Rule: Can sort by zip code ascending or descending. Parents first then branches

    @feat:21820
    Scenario: Sort by zip code ascending
      Given the following dealer contracts:
        | vin    | company name    | zip code |
        | Vin1   | Apex Motors     | 10001    |
        | Vin2   | AutoPeak        | 92600    |
        | Vin3   | Apextra Cars    | 75000    |
        | Vin4   | APEX Drive      | 91100    |
        | Vin5   | APEX No Zip     |          |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      When I search "Apex"
      And I display 10 items per page
      And I sort by zip code
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | APEX No Zip         | Vin5 | Parent |              |          |                    |
        | Apextra Cars        | Vin3 | Parent |              | 75000    |                    |
        | Apex Motors         | Vin1 | Parent |              | 10001    |                    |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |
        | APEX Drive          | Vin4 | Parent |              | 91100    |                    |
        | AutoPeak            | Vin2 | Parent |              | 92600    |                    |

    @feat:21820
    Scenario: Sort by zip code descending
      Given the following dealer contracts:
        | vin    | company name    | zip code |
        | Vin1   | Apex Motors     | 10001    |
        | Vin2   | AutoPeak        | 92600    |
        | Vin3   | Apextra Cars    | 75000    |
        | Vin4   | APEX Drive      | 91100    |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      When I search "Apex"
      And I display 10 items per page
      And I sort by zip code
      And I sort by zip code
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | AutoPeak            | Vin2 | Parent |              | 92600    |                    |
        | APEX Drive          | Vin4 | Parent |              | 91100    |                    |
        | Apex Motors         | Vin1 | Parent |              | 10001    |                    |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |
        | Apextra Cars        | Vin3 | Parent |              | 75000    |                    |

  Rule: Can sort by city ascending or descending. Parents first then branches

    @feat:21821
    Scenario: Sort by city ascending
      Given the following dealer contracts:
        | vin    | company name    | zip code | city               |
        | Vin1   | Apex Motors     | 10001    | New York           |
        | Vin2   | AutoPeak        | 92600    | Los Angeles        |
        | Vin3   | Apextra Cars    | 75000    | New York           |
        | Vin4   | APEX Drive      | 91100    | Houston            |
        | Vin5   | APEX No City    |          |                    |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      When I search "Apex"
      And I display 10 items per page
      And I sort by city
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | APEX No City        | Vin5 | Parent |              |          |                    |
        | AutoPeak            | Vin2 | Parent |              | 92600    | Los Angeles        |
        | APEX Drive          | Vin4 | Parent |              | 91100    | Houston            |
        | Apextra Cars        | Vin3 | Parent |              | 75000    | New York           |
        | Apex Motors         | Vin1 | Parent |              | 10001    | New York           |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |

    @feat:21821
    Scenario: Sort by city descending
      Given the following dealer contracts:
        | vin    | company name    | zip code | city               |
        | Vin1   | Apex Motors     | 10001    | New York           |
        | Vin2   | AutoPeak        | 92600    | Los Angeles        |
        | Vin3   | Apextra Cars    | 75000    | New York           |
        | Vin4   | APEX Drive      | 91100    | Houston            |
        | Vin5   | APEX No City    |          |                    |
      And the company "Apex Motors" has the following branches:
        | Branch              | address1     | address2 | address3 | address4 | zip code | city               |
        | APEX CONSULTING HUB | Main Street  |          |          |          | 10001    | New York           |
        | APEX SOUTH BRANCH   | Side Road    |          |          |          | 92600    | Los Angeles        |
        | APEX NORTH BRANCH   | Main Street  |          |          |          | 01200    | Springfield        |
      And I am a user on the home page
      When I search "Apex"
      And I display 10 items per page
      And I sort by city
      And I sort by city
      Then the following results are displayed
        | Company Name        | VIN  | Scope  | Address      | Zip Code | City               |
        | Apextra Cars        | Vin3 | Parent |              | 75000    | New York           |
        | Apex Motors         | Vin1 | Parent |              | 10001    | New York           |
        | APEX NORTH BRANCH   |      | Branch | Main Street  | 01200    | Springfield        |
        | APEX CONSULTING HUB |      | Branch | Main Street  | 10001    | New York           |
        | APEX SOUTH BRANCH   |      | Branch | Side Road    | 92600    | Los Angeles        |
        | APEX Drive          | Vin4 | Parent |              | 91100    | Houston            |
        | AutoPeak            | Vin2 | Parent |              | 92600    | Los Angeles        |
        | APEX No City        | Vin5 | Parent |              |          |                    |
