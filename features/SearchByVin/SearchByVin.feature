Feature: Search by VIN

  Rule: The search should display results in the results table
    Background:
      Given the following dealer contracts:
        | vin               | company name         |
        | 1HGCM82633A004352 | RAINBOW MOTORS INC   |
        | 2T1BURHE0JC043821 | CENTRAL AUTO GROUP   |
      And the company "CENTRAL AUTO GROUP" has the following branches:
        | Branch                | address1           | address2                 | address3  | address4 | zip code | city        |
        | Central Auto Midwest  | LLC                | 22 Industrial Boulevard  | PO Box 12 | SUITE    | 60601    | Chicago     |
        | Central Auto South    | 8 Commerce Street  |                          |           |          | 30301    | Atlanta     |
      And the company "RAINBOW MOTORS INC" has the following branches:
        | Branch              | address1 | address2                 | address3  | address4 | zip code | city        |
        | Rainbow Fleet Depot | LLC      | 23 Industrial Boulevard  | PO Box 12 | SUITE    | 60601    | Chicago     |

    Scenario: Search by VIN
      Given I am a user on the home page
      When I search by VIN "1HGCM82633A004352"
      Then the following results are displayed
        | Company Name         | VIN               | Scope    | Address                                     | Zip Code | City        |
        | CENTRAL AUTO GROUP   | 2T1BURHE0JC043821 | Parent   |                                             |          |             |
        | Central Auto Midwest |                   | Branch   | LLC 22 Industrial Boulevard PO Box 12 SUITE | 60601    | Chicago     |
        | Central Auto South   |                   | Branch   | 8 Commerce Street                           | 30301    | Atlanta     |
        | RAINBOW MOTORS INC   | 1HGCM82633A004352 | Parent   |                                             |          |             |
        | Rainbow Fleet Depot  |                   | Branch   | LLC 23 Industrial Boulevard PO Box 12 SUITE | 60601    | Chicago     |

    Scenario: I press the enter key after typing my search and get my results
      Given I am a user on the home page
      When I search by VIN
      When I type "1HGCM82633A004352" in the search field
      And I press enter in the search field
      Then the following results are displayed
        | Company Name         | VIN               | Scope    | Address                                     | Zip Code | City        |
        | CENTRAL AUTO GROUP   | 2T1BURHE0JC043821 | Parent   |                                             |          |             |
        | Central Auto Midwest |                   | Branch   | LLC 22 Industrial Boulevard PO Box 12 SUITE | 60601    | Chicago     |
        | Central Auto South   |                   | Branch   | 8 Commerce Street                           | 30301    | Atlanta     |
        | RAINBOW MOTORS INC   | 1HGCM82633A004352 | Parent   |                                             |          |             |
        | Rainbow Fleet Depot  |                   | Branch   | LLC 23 Industrial Boulevard PO Box 12 SUITE | 60601    | Chicago     |

    Scenario: Search by VIN with error
      Given I am a user on the home page and the search returns an error
      When I search by VIN "0000000000"
      Then the error message "No results found for the search performed" appears

  Rule: Search requires at least 9 characters
    Scenario Outline: When I type <search> in the VIN search the button is <status>
      Given I am a user on the home page
      When I search by VIN
      When I type "<search>" in the search field
      Then the "Search" button is <status>
      Examples:
        | search     | status   |
        |            | disabled |
        | 0          | disabled |
        | 01         | disabled |
        | 01234567   | disabled |
        | 012345678  | enabled  |
        | 0123456789 | enabled  |
