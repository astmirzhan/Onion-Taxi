import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { NETWORK_NAME, EXPECTED_CHAIN_ID } from '../config.js';

export default function WalletBar({ onConnect, account, setAccount, provider, setProvider, signer, setSigner }) {
    const [chainId, setChainId] = useState(null);
    const [networkName, setNetworkName] = useState('');
    const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            // Check if already connected
            checkConnection();

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    const checkConnection = async () => {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (err) {
            console.error('Check connection error:', err);
        }
    };

    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setSigner(null);
            setProvider(null);
        } else {
            connectWallet();
        }
    };

    const handleChainChanged = () => {
        window.location.reload();
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('MetaMask is not installed! Please install MetaMask.');
            return;
        }

        setConnecting(true);
        setError('');

        try {
            const browserProvider = new BrowserProvider(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            const network = await browserProvider.getNetwork();
            const currentChainId = Number(network.chainId);
            setChainId(currentChainId);
            setNetworkName(getNetworkName(currentChainId));
            setIsCorrectNetwork(currentChainId === EXPECTED_CHAIN_ID);

            const signerInstance = await browserProvider.getSigner();
            const address = await signerInstance.getAddress();

            setProvider(browserProvider);
            setSigner(signerInstance);
            setAccount(address);

            if (onConnect) {
                onConnect(address, signerInstance, browserProvider);
            }
        } catch (err) {
            console.error('Connect wallet error:', err);
            if (err.code === 4001) {
                setError('Connection rejected by user');
            } else {
                setError('Connection error: ' + err.message);
            }
        } finally {
            setConnecting(false);
        }
    };

    const getNetworkName = (chainId) => {
        const networks = {
            1: 'Ethereum Mainnet',
            5: 'Goerli',
            11155111: 'Sepolia',
            31337: 'Localhost (Hardhat)',
            1337: 'Localhost',
        };
        return networks[chainId] || `Chain ID: ${chainId}`;
    };

    const truncateAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="card">
            <div className="wallet-bar">
                {account ? (
                    <div className="wallet-info">
                        <span className="wallet-address">{truncateAddress(account)}</span>
                        <span className={`network-badge ${isCorrectNetwork ? 'correct' : 'wrong'}`}>
                            {networkName}
                        </span>
                    </div>
                ) : (
                    <div>
                        <button
                            className="btn btn-primary"
                            onClick={connectWallet}
                            disabled={connecting}
                        >
                            {connecting ? (
                                <>
                                    <span className="spinner"></span>
                                    Connecting...
                                </>
                            ) : (
                                '🦊 Connect MetaMask'
                            )}
                        </button>
                    </div>
                )}

                {account && (
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                            setAccount(null);
                            setSigner(null);
                            setProvider(null);
                        }}
                    >
                        Disconnect
                    </button>
                )}
            </div>

            {error && <div className="message message-error">{error}</div>}

            {account && !isCorrectNetwork && (
                <div className="network-warning">
                    ⚠️ Wrong Network! Please switch to {NETWORK_NAME} (Chain ID: {EXPECTED_CHAIN_ID})
                </div>
            )}
        </div>
    );
}
