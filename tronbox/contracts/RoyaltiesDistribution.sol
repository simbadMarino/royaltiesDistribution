// SPDX-License-Identifier: MIT
/*
1) Add shareholder addresses
2) Remove shareholders addresses
3) Modify shares weight for each shareholder
4) Distribute USDT depending on each shareholder shares
5) Modify TRC20 token contract address
*/
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface ITRC20 {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract RoyaltiesDistribution is Ownable {
    using SafeMath for uint256;

    struct Payee {
        address account;
        uint256 share;
    }

    ITRC20 public usdtToken;
    Payee[] public payees;
    uint256 public totalShares;

    event PayeeAdded(address account, uint256 share);
    event PayeeRemoved(address account);
    event RoyaltiesDistributed(uint256 amount);
    event DistributionFailed(address account, uint256 amount);
    event TokenContractUpdated(address newTokenContract);

    constructor(address _usdtToken) {
        usdtToken = ITRC20(_usdtToken);
        totalShares = 0;
    }

    function addPayee(address account, uint256 share) external onlyOwner {
        require(account != address(0), "Account is the zero address"); //This helps to protect users from adding the 0 address (burn address)
        require(share > 0, "Share must be greater than zero");
        payees.push(Payee(account, share));
        totalShares = totalShares.add(share);
        emit PayeeAdded(account, share);
    }

    function removePayee(address account) external onlyOwner {
        require(account != address(0), "Account is the zero address");

        for (uint256 i = 0; i < payees.length; i++) {
            if (payees[i].account == account) {
                totalShares = totalShares.sub(payees[i].share); //Deduct the to be removed account shares from the total shares

                // Swap with the last element and pop
                payees[i] = payees[payees.length - 1];
                payees.pop();

                emit PayeeRemoved(account);
                break;
            }
        }
    }

    function updateTokenContract(address newTokenContract) external onlyOwner {
        require(
            newTokenContract != address(0),
            "New token contract is the zero address"
        );
        usdtToken = ITRC20(newTokenContract);
        emit TokenContractUpdated(newTokenContract);
    }

    function distributeRoyalties() external onlyOwner {
        require(totalShares > 0, "No shares defined");
        uint256 totalAmount = usdtToken.balanceOf(address(this));
        require(totalAmount > 0, "No USDT to distribute");

        for (uint256 i = 0; i < payees.length; i++) {
            Payee memory payee = payees[i];
            uint256 payment = totalAmount.mul(payee.share).div(totalShares);
            bool success = usdtToken.transfer(payee.account, payment);
            if (!success) {
                emit DistributionFailed(payee.account, payment);
                revert("USDT transfer failed");
            }
        }

        emit RoyaltiesDistributed(totalAmount);
    }

    function getPayees() external view returns (Payee[] memory) {
        return payees;
    }

    function getTotalShares() external view returns (uint256) {
        return totalShares;
    }
}
