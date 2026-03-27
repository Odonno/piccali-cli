Feature: Sub-contracts display

  Background:
    Given the company "AutoNation" has the following contracts
      | contractNumber     | category   |
      | contract-extend1   | Extended   |
      | contract-extend2   | Extended   |
      | contract-extend3   | Extended   |
      | contract-extend4   | Extended   |
    *    the contract "contract-extend1" has the following sub-contracts:
      | companyName      | contractNumber    | startDate  | endDate    |
      | FleetCo          | sub-contract11    | 01/01/2000 |            |
      | AutoNation West  | sub-contract12    | 01/01/2005 | 01/01/2022 |
      | AutoNation Corp  | sub-contract13    | 01/01/2010 | 01/05/2022 |
    *    the contract "contract-extend2" has the following sub-contracts:
      | companyName | contractNumber    | startDate  | endDate    |
      | FleetCo     | sub-contract21    | 01/01/2000 | 01/01/2022 |
    *    the contract "contract-extend3" has the following sub-contracts:
      | companyName | contractNumber    | startDate  | endDate |
      | FleetCo     | sub-contract31    | 01/01/2000 |         |
    *    the contract "contract-extend4" has the following sub-contracts:
      | companyName      | contractNumber    | startDate  | endDate    |
      | FleetCo          | sub-contract41    | 04/08/1980 |            |
      | AutoNation West  | sub-contract42    | 15/03/2015 | 17/08/2022 |

  Rule: When a selected contract has only one sub-contract, it is displayed below the contract

    Example: Single sub-contract with end date
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend2"
      *    the contract "contract-extend2" displays the following sub-contract
        | companyName | contractNumber    | startDate  | endDate    |
        | FleetCo     | sub-contract21    | 01/01/2000 | 01/01/2022 |

    Example: Single sub-contract without end date
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend3"
      *    the contract "contract-extend3" displays the following sub-contract
        | companyName | contractNumber    | startDate  | endDate |
        | FleetCo     | sub-contract31    | 01/01/2000 | -       |

  Rule: When a selected contract has multiple sub-contracts, they can be displayed in a side panel

    Example: I expand the sub-contracts panel and can view the sub-contract details
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      Then the side panel displays the following sub-contracts:
        | companyName      | contractNumber    | startDate  | endDate    |
        | FleetCo          | sub-contract11    | 01/01/2000 | -          |
        | AutoNation West  | sub-contract12    | 01/01/2005 | 01/01/2022 |
        | AutoNation Corp  | sub-contract13    | 01/01/2010 | 01/05/2022 |

    Example: I collapse the sub-contracts panel and it is no longer shown
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      *    I hide the sub-contracts
      Then the side panel is not displayed

    Example: I close the sub-contracts panel by clicking the cross and it is no longer shown
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      *    I close the sub-contracts by clicking the cross
      Then the side panel is not displayed

  Rule: When the selected contract changes, I update the sub-contracts panel content

    Example: I switch to a contract with multiple sub-contracts
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      *    I select the contract "contract-extend4"
      Then the side panel displays the following sub-contracts:
        | companyName      | contractNumber    | startDate  | endDate    |
        | FleetCo          | sub-contract41    | 04/08/1980 | -          |
        | AutoNation West  | sub-contract42    | 15/03/2015 | 17/08/2022 |

    Example: I switch to a contract with a single sub-contract
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      *    I select the contract "contract-extend3"
      Then the side panel is not displayed

  Rule: Sub-contracts are sorted by end date
    Sub-contracts with an end date are shown first.
    If there are multiple, they are sorted by nearest end date first.

    Example: Sub-contracts are sorted by end date
      When I display the search results for the company "AutoNation"
      *    I select the contract "contract-extend1"
      *    I display the sub-contracts
      Then the sub-contracts are displayed in this order:
        | contractNumber    |
        | sub-contract12    |
        | sub-contract13    |
        | sub-contract11    |
