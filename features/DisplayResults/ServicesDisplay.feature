Feature: Services display

  Background:
    Given the company "AutoNation" has the following contracts
      | contractNumber          | category           |
      | contract-extended1      | Extended Warranty  |
      | contract-roadside1      | Roadside Assist    |
      | contract-extended2      | Extended Warranty  |
      | contract-roadside2      | Roadside Assist    |
    *     the legal contract "contract-extended1" has the following services:
      | name                                   | agreement | destination |
      | Regulatory obligations: RoadAssist Pro | 123456    | Dealer      |
      | Crash Coverage                         |           | Drivers     |
      | Theft Guard                            |           | Dealer      |
      | Glass Shield                           |           | Dealer      |
      | Tire Protect                           |           | Drivers     |
    *     the legal contract "contract-extended2" has the following services:
      | name                     | agreement | destination |
      | Tire Protect             |           | Drivers     |
      | Total Assist + Roadside  | 65431     | Dealer      |

  Example: By default the first contract is selected and its services are displayed
    When I display the search results for the company "AutoNation"
    Then the contract "contract-extended1" is selected
    *    the following services are available
      | name                                   | agreement | destination     |
      | Regulatory obligations: RoadAssist Pro | 123456    | Dealer Service |
      | Crash Coverage                         |           | Driver Service  |
      | Theft Guard                            |           | Dealer Service  |
      | Glass Shield                           |           | Dealer Service  |
      | Tire Protect                           |           | Driver Service  |

  Example: I select a different contract and its services are displayed
    When I display the search results for the company "AutoNation"
    *    I select the contract "contract-extended2"
    Then    the following services are available
      | name                     | agreement | destination     |
      | Tire Protect             |           | Driver Service  |
      | Total Assist + Roadside  | 65431     | Dealer Service  |
