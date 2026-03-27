Feature: Agreement display on each contract

  Background:
    Given the company "AutoNation" has the following contracts
      | contractNumber     | category          |
      | contract-extended1 | Extended Warranty |
      | contract-extended2 | Extended Warranty |
      | contract-extended3 | Extended Warranty |
      | contract-extended4 | Extended Warranty |
    *    the contract "contract-extended1" has the following sub-contracts:
      | companyName      | contractNumber    | startDate  | endDate    |
      | FleetCo          | sub-contract11    | 01/01/2000 |            |
      | AutoNation West  | sub-contract12    | 01/01/2005 | 01/01/2022 |
      | AutoNation Corp  | sub-contract13    | 01/01/2010 | 01/05/2022 |

  Scenario: Display a contract with no agreement
    Given the contract "contract-extended1" has the following agreements
        | agreementNumber | exists |
    And I display the search results for the company "AutoNation"
    When I select the contract "contract-extended1"
    Then the contract "contract-extended1" displays the following agreements
        | agreementNumber |
        | -               |

  Scenario: Display a contract with multiple agreements
    Given the contract "contract-extended1" has the following agreements
        | agreementNumber | exists |
        | 123456          | true   |
        | 456123          | false  |
    And I display the search results for the company "AutoNation"
    When I select the contract "contract-extended1"
    Then the contract "contract-extended1" displays the following agreements
        | agreementNumber |
        | 123456          |
        | 456123          |

  Scenario: Display a contract with an agreement to configure
    Given the contract "contract-extended1" has the following agreements
        | agreementNumber | exists |
        | 456123          | false  |
    And I display the search results for the company "AutoNation"
    And I select the contract "contract-extended1"
    When I click the agreement number button
    Then I see the message "The agreement needs to be configured"
