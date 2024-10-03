import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import RoyaltiesABI from '../abi/RoyaltiesDistribution.json';
import RoyaltiesBytecode from '../bytecode/Royalties.json';

declare global {
  interface Window {
    tronWeb: any;
  }
}

export default function Home() {
  const [tronWeb, setTronWeb] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isContractDeployed, setIsContractDeployed] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [contractAddress, setContractAddress] = useState<string | null>('');

  useEffect(() => {
    const initTronWeb = async () => {
      if (window.tronWeb && window.tronWeb.ready) {
        setTronWeb(window.tronWeb);
        const acc = await window.tronWeb.trx.getAccount();
        setAccount(acc.address);
      }
    };

    initTronWeb();
  }, []);

  const connectWallet = async () => {
    if (window.tronWeb) {
      try {
        await window.tronWeb.request({ method: 'tron_requestAccounts' });
        const acc = await window.tronWeb.trx.getAccount();
        setAccount(acc.address);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install TronLink extension');
    }
  };

  const deployContract = async () => {
    if (!tronWeb) {
      alert('Please connect your wallet first');
      return;
    }

    setIsDeploying(true);

    try {
      const contract_instance = await tronWeb.contract().new({
        abi: RoyaltiesABI.abi,
        bytecode: RoyaltiesBytecode.object,
        feeLimit: 1000000000,
        callValue: 0,
        userFeePercentage: 1,
        originEnergyLimit: 10000000,
        parameters: ['TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf'],
        from: window.tronWeb.trx.getAccount(), 
      });

      console.log('Contract deployed at:', contract_instance.address);
      setContractAddress(contract_instance.address);
      setIsContractDeployed(true);

      const instance = await tronWeb.contract(RoyaltiesABI, contract_instance.address);
      setContract(instance);
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      alert('Failed to deploy contract. Please check the console for details.');
    } finally {
      setIsDeploying(false);
    }
  };

  const addPayee = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    const address = prompt('Enter payee address:');
    const share = prompt('Enter payee share:');

    if (!address || !share) {
      alert('Invalid input');
      return;
    }

    try {
      const result = await executeTransaction(
        'addPayee(address,uint256)',
        [address, parseInt(share)],
        { feeLimit: 1000000000 }
      );
      console.log('Payee added:', result);
      alert('Payee added successfully');
    } catch (error) {
      console.error('Failed to add payee:', error);
      alert('Failed to add payee. Please check the console for details.');
    }
  };

  const removePayee = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    const address = prompt('Enter payee address to remove:');

    if (!address) {
      alert('Invalid input');
      return;
    }

    try {
      const result = await executeTransaction(
        'removePayee(address)',
        [address],
        { feeLimit: 1000000000 }
      );
      console.log('Payee removed:', result);
      alert('Payee removed successfully');
    } catch (error) {
      console.error('Failed to remove payee:', error);
      alert('Failed to remove payee. Please check the console for details.');
    }
  };

  const updateTokenContract = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    const newTokenAddress = prompt('Enter new token contract address:');

    if (!newTokenAddress) {
      alert('Invalid input');
      return;
    }

    try {
      const result = await executeTransaction(
        'updateTokenContract(address)',
        [newTokenAddress],
        { feeLimit: 1000000000 }
      );
      console.log('Token contract updated:', result);
      alert('Token contract updated successfully');
    } catch (error) {
      console.error('Failed to update token contract:', error);
      alert('Failed to update token contract. Please check the console for details.');
    }
  };

  const distributeRoyalties = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    try {
      const result = await executeTransaction(
        'distributeRoyalties()',
        [],
        { feeLimit: 1000000000 }
      );
      console.log('Royalties distributed:', result);
      alert('Royalties distributed successfully');
    } catch (error) {
      console.error('Failed to distribute royalties:', error);
      alert('Failed to distribute royalties. Please check the console for details.');
    }
  };

  const viewPayees = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    try {
      const totalShares = await contract.totalShares().call();
      let payees = [];
      let i = 0;

      while (true) {
        try {
          const payee = await contract.payees(i).call();
          payees.push({ account: payee.account, share: payee.share.toString() });
          i++;
        } catch (error) {
          break; 
        }
      }

      console.log('Total Shares:', totalShares.toString());
      console.log('Payees:', payees);
      alert(`Total Shares: ${totalShares}\n\nPayees:\n${payees.map(p => `${p.account}: ${p.share} shares`).join('\n')}`);
    } catch (error) {
      console.error('Failed to view payees:', error);
      alert('Failed to view payees. Please check the console for details.');
    }
  };

  const viewFunds = async () => {
    if (!tronWeb || !contract) {
      alert('Please connect your wallet and deploy the contract first');
      return;
    }

    try {
      const usdtTokenAddress = await contract.usdtToken().call();
      const usdtContract = await tronWeb.contract().at(usdtTokenAddress);
      const balance = await usdtContract.balanceOf(contractAddress).call();
      console.log('Contract USDT balance:', balance.toString());
      alert(`Contract USDT balance: ${balance} (in smallest unit)`);
    } catch (error) {
      console.error('Failed to view funds:', error);
      alert('Failed to view funds. Please check the console for details.');
    }
  };

  const executeTransaction = async (functionSelector: string, parameters: any[] = [], options: any = {}) => {
    if (!tronWeb || !contract) {
      throw new Error('TronWeb or contract not initialized');
    }

    const issuerAddress = account;
    const transactionWrap = await tronWeb.transactionBuilder.triggerSmartContract(
      contractAddress,
      functionSelector,
      options,
      parameters,
      issuerAddress
    );

    if (!transactionWrap.result || !transactionWrap.result.result) {
      throw new Error('Transaction creation failed');
    }

    const signedTx = await tronWeb.trx.sign(transactionWrap.transaction);
    const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

    return receipt;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.connectButtonWrapper}>
          <button className={styles.connectButton} onClick={connectWallet}>
            {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
        <h1 className={styles.title}>Royalties</h1>
        <div></div> 
      </header>
      <main className={styles.main}>
        {isContractDeployed ? (
          <div className={styles.buttonGrid}>
            <button className={styles.button} onClick={addPayee}>Add Payee</button>
            <button className={styles.button} onClick={removePayee}>Remove Payee</button>
            <button className={styles.button} onClick={updateTokenContract}>Update Token Contract</button>
            <button className={styles.button} onClick={distributeRoyalties}>Distribute Royalties</button>
            <button className={styles.button} onClick={viewPayees}>View Payees</button>
            <button className={styles.button} onClick={viewFunds}>View Funds</button>
          </div>
        ) : (
          <div className={styles.deployButtonWrapper}>
            <button 
              className={styles.deployButton} 
              onClick={deployContract}
              disabled={isDeploying || !account}
            >
              {isDeploying ? 'Deploying...' : 'Deploy Contract'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}