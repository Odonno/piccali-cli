Feature: Search by contract number

  Rule: The search should display results in the results table
    Background:
      Given a parent company "RAINBOW MOTORS INC" with a legal contract "22815092700"
      And a parent company "AUTOVISION SA" with a legal contract "22815092701"
      And a parent company "DRIVENOW SAS" with a legal contract "22815092702"
      And the individual contract "0000000000492904"
      And the legal contract "22815092700" has the following services:
        | name            |
        | ROADASSIST PRO  |
        | CRASH COVER     |
        | THEFT GUARD     |
        | GLASS SHIELD    |
        | TIRE PROTECT    |
      And the individual contract "0000000000492904" has the following services:
        | name            |
        | ROADASSIST PRO  |
        | CRASH COVER     |
        | THEFT GUARD     |
        | GLASS SHIELD    |
        | TIRE PROTECT    |
      And a branch "RAINBOW MOTORS INC" with a sub-contract "2281804540020" active linked to legal contract "22815092700":
        | Branch               | address1           | address2                 | address3  | address4 | zip code | city        |
        | Rainbow Midwest Hub  | LLC                | 22 Industrial Boulevard  | PO Box 12 | SUITE    | 60601    | Chicago     |
        | Rainbow South Hub    | 8 Commerce Street  |                          |           |          | 30301    | Atlanta     |

    Scenario: Search by collective contract number
      When I am on the search page
      And I search by contract number "22815092700"
      Then the results table displays "1 contracts found"
      And the title "Service list for contract No. 22815092700 : RAINBOW MOTORS INC - VIN 54209753000092 - 26 MARKET STREET, 10001 NEW YORK" should be displayed
      And in the "Services" table I have the following services
        | name            |
        | CRASH COVER     |
        | GLASS SHIELD    |
        | ROADASSIST PRO  |
        | THEFT GUARD     |
        | TIRE PROTECT    |
      And the title "Contract details" should be displayed
      And the contract selection input should not be displayed

    Scenario: Search by individual contract number
      When I am on the search page
      And I search by contract number "0000000000492904"
      Then the results table displays "1 contracts found"
      And the title "Service list for contract No. 0000000000492904" should be displayed
      And in the "Services" table I have the following services
        | name            |
        | CRASH COVER     |
        | GLASS SHIELD    |
        | ROADASSIST PRO  |
        | THEFT GUARD     |
        | TIRE PROTECT    |
      And the contract selection input should not be displayed

    Scenario: The contract number is not found
      When I am on the search page
      And I search by contract number "nonexistentnumber"
      Then a message indicates "results — 0 contracts found"
      And the results table is not displayed

    @feat:32954
    Scenario: Search on a fleet contract returning 3 legal contracts
      Given the fleet contract "FLEET-112" is associated with the following legal contracts:
        | contractNumber |
        | 22815092700    |
        | 22815092701    |
        | 22815092702    |
      When I am on the search page
      And I search by contract number "FLEET-112"
      Then an alert indicates "results — 3 contracts found"

    @feat:32954
    Scenario: Search on a fleet contract returning no legal contracts
      Given the fleet contract "FLEET-112" is associated with the following legal contracts:
        | contractNumber |
      When I am on the search page
      And I search by contract number "FLEET-112"
      Then an alert indicates "results — 0 contracts found"
      And the results table is not displayed

    @feat:32954
    Scenario: Select a legal contract from a fleet contract search
      Given the fleet contract "FLEET-112" is associated with the following legal contracts:
        | contractNumber |
        | 22815092700    |
        | 22815092701    |
        | 22815092702    |
      When I am on the search page
      And I search by contract number "FLEET-112"
      And I select the contract "22815092700"
      Then an alert indicates "results — 3 contracts found"
      And the title "Service list for contract No. 22815092700 : RAINBOW MOTORS INC - VIN 54209753000092 - 26 MARKET STREET, 10001 NEW YORK" should be displayed
      And in the "Services" table I have the following services
        | name            |
        | CRASH COVER     |
        | GLASS SHIELD    |
        | ROADASSIST PRO  |
        | THEFT GUARD     |
        | TIRE PROTECT    |
      And the title "Contract details" should be displayed
      And the contract selection input should not be displayed

    @fix:33019
    Scenario: Search on a fleet contract, display an error message if the lookup service times out
      Given the fleet contract lookup service is in timeout
      When I am on the search page
      And I search by contract number "FLEET-112"
      Then a message indicates "The fleet contract lookup database did not respond within the expected time."
