Feature: Contract filtering by category

  In the results display block I can filter the
  results by category (extended warranty, roadside assistance, etc).

  Background:
    Given the company "AutoNation" has the following contracts
      | contractNumber          | category           | endDate             | status     |
      | contract-extended1      | Extended Warranty  | 2022-12-01T00:00:00 | Active     |
      | contract-roadside1      | Roadside Assist    |                     | Suspended  |
      | contract-extended2      | Extended Warranty  |                     | Terminated |
      | contract-roadside2      | Roadside Assist    |                     | Expired    |
      | contract-extended3      | Extended Warranty  | 2022-12-01T00:00:00 |            |
    * the contract "contract-extended1" has the following sub-contracts:
      | companyName      | contractNumber    | startDate  | endDate    |
      | FleetCo          | sub-contract11    | 01/01/2000 |            |
      | AutoNation West  | sub-contract12    | 01/01/2005 | 01/01/2022 |
      | AutoNation Corp  | sub-contract13    | 01/01/2010 | 01/05/2022 |
    * the contract "contract-extended2" has the following sub-contracts:
      | companyName | contractNumber    | startDate  | endDate |
      | FleetCo     | sub-contract31    | 01/01/2000 |         |

  Example: Filter on extended warranty
    When I display the search results for the company "AutoNation"
    And I filter only on "Extended Warranty" contracts
    Then the following contracts are displayed in the results
      | contractNumber     |
      | contract-extended1 |
      | contract-extended2 |
      | contract-extended3 |
    *   the contract "contract-extended1" is selected

  Example: Filter on roadside assistance
    When I display the search results for the company "AutoNation"
    *    I filter only on "Roadside Assist" contracts
    Then the following contracts are displayed in the results
      | contractNumber      |
      | contract-roadside1  |
      | contract-roadside2  |
    *   the contract "contract-roadside1" is selected
    *   the status "Suspended" is displayed

  Example: Return to All contracts
    When I display the search results for the company "AutoNation"
    *    I filter only on "Extended Warranty" contracts
    *    I remove the contract filter
    Then the following contracts are displayed in the results
      | contractNumber      |
      | contract-extended1  |
      | contract-roadside1  |
      | contract-extended2  |
      | contract-roadside2  |
      | contract-extended3  |
    *   the contract "contract-extended1" is selected
    *   the category "Extended Warranty" is displayed
    *   the status "Active" is displayed

  Example: Display the end date alert
    When I display the search results for the company "AutoNation"
    Then the contract "contract-extended1" is selected

  Example: No end date alert displayed
    When I display the search results for the company "AutoNation"
    *    I filter only on "Roadside Assist" contracts
    Then the contract "contract-roadside1" is selected

  Example: Display contract contract-extended2
    When I display the search results for the company "AutoNation"
    *    I filter only on "Extended Warranty" contracts
    *    I select the contract "contract-extended2"
    Then the status "Terminated" is displayed

  Example: Display contract contract-roadside2
    When I display the search results for the company "AutoNation"
    *    I filter only on "Roadside Assist" contracts
    *    I select the contract "contract-roadside2"
    Then the status "Terminated" is displayed

  Example: Display contract contract-extended3
    When I display the search results for the company "AutoNation"
    *    I filter only on "Extended Warranty" contracts
    *    I select the contract "contract-extended3"
    Then the status "Unknown" is displayed

  Rule: Display the end date alert based on whether an end date exists on sub-contracts

    Example: Display the alert
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extended1"
      Then the end date alert is displayed

    Example: No alert displayed
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extended2"
      Then the end date alert is not displayed
