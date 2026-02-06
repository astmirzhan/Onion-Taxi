import { useState, useEffect } from 'react';
import { Contract, formatUnits, parseUnits } from 'ethers';
import { ONT_ADDRESS, DAO_ADDRESS } from '../config.js';
import ONTTokenABI from '../../../artifacts/contracts/ONTToken.sol/ONTToken.json';
import OnionDAOABI from '../../../artifacts/contracts/OnionDAO.sol/OnionDAO.json';

export default function DaoPanel({ provider, signer, account }) {
    const [ontBalance, setOntBalance] = useState('0');
    const [approveAmount, setApproveAmount] = useState('');
    const [stakeAmount, setStakeAmount] = useState('');
    const [unstakeAmount, setUnstakeAmount] = useState('');

    const [stakedAmount, setStakedAmount] = useState('0');
    const [isEligible, setIsEligible] = useState(false);
    const [votingPower, setVotingPower] = useState('0');
    const [minBalanceToVote, setMinBalanceToVote] = useState('0');
    const [minStakeToVote, setMinStakeToVote] = useState('0');

    const [proposals, setProposals] = useState([]);
    const [proposalDescription, setProposalDescription] = useState('');
    const [proposalDuration, setProposalDuration] = useState('');

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (account && provider) {
            loadData();
        }
    }, [account, provider]);

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            const ontToken = new Contract(ONT_ADDRESS, ONTTokenABI.abi, provider);
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, provider);

            const balance = await ontToken.balanceOf(account);
            setOntBalance(formatUnits(balance, 18));

            const staked = await dao.staked(account);
            setStakedAmount(formatUnits(staked, 18));

            const eligible = await dao.isEligible(account);
            setIsEligible(eligible);

            const power = await dao.votingPower(account);
            setVotingPower(formatUnits(power, 18));

            const minBalance = await dao.MIN_BALANCE_TO_VOTE();
            setMinBalanceToVote(formatUnits(minBalance, 18));

            const minStake = await dao.MIN_STAKE_TO_VOTE();
            setMinStakeToVote(formatUnits(minStake, 18));

            await loadProposals();
        } catch (err) {
            console.error('Load data error:', err);
            setError('Ошибка загрузки: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadProposals = async () => {
        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, provider);
            const count = await dao.proposalsCount();

            const proposalsList = [];
            for (let i = 0; i < count; i++) {
                const p = await dao.proposals(i);
                proposalsList.push({
                    id: i,
                    description: p.description,
                    deadline: Number(p.deadline),
                    yesVotes: formatUnits(p.yesVotes, 18),
                    noVotes: formatUnits(p.noVotes, 18),
                    executed: p.executed
                });
            }
            setProposals(proposalsList);
        } catch (err) {
            console.error('Load proposals error:', err);
        }
    };

    const extractErrorReason = (err) => {
        if (err.reason) return err.reason;
        if (err.data?.message) return err.data.message;
        if (err.error?.message) return err.error.message;
        if (err.message) {
            const match = err.message.match(/reason="([^"]+)"/);
            if (match) return match[1];
            const customMatch = err.message.match(/reverted with custom error '(\w+)\(\)'/);
            if (customMatch) return customMatch[1];
            return err.message.slice(0, 150);
        }
        return 'Неизвестная ошибка';
    };

    const handleApprove = async () => {
        if (!signer || !approveAmount) return;
        setActionLoading('approve');
        setError('');
        setSuccess('');

        try {
            const ontToken = new Contract(ONT_ADDRESS, ONTTokenABI.abi, signer);
            const amount = parseUnits(approveAmount, 18);
            const tx = await ontToken.approve(DAO_ADDRESS, amount);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Approve выполнен!');
            setApproveAmount('');
        } catch (err) {
            console.error('Approve error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleStake = async () => {
        if (!signer || !stakeAmount) return;
        setActionLoading('stake');
        setError('');
        setSuccess('');

        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, signer);
            const amount = parseUnits(stakeAmount, 18);
            const tx = await dao.stake(amount);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Стейкинг выполнен!');
            setStakeAmount('');
            loadData();
        } catch (err) {
            console.error('Stake error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleUnstake = async () => {
        if (!signer || !unstakeAmount) return;
        setActionLoading('unstake');
        setError('');
        setSuccess('');

        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, signer);
            const amount = parseUnits(unstakeAmount, 18);
            const tx = await dao.unstake(amount);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Unstake выполнен!');
            setUnstakeAmount('');
            loadData();
        } catch (err) {
            console.error('Unstake error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleCreateProposal = async () => {
        if (!signer || !proposalDescription || !proposalDuration) return;
        setActionLoading('createProposal');
        setError('');
        setSuccess('');

        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, signer);
            const durationSeconds = Number(proposalDuration) * 60;
            const tx = await dao.createProposal(proposalDescription, durationSeconds);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Предложение создано!');
            setProposalDescription('');
            setProposalDuration('');
            loadProposals();
        } catch (err) {
            console.error('Create proposal error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleVote = async (proposalId, support) => {
        if (!signer) return;
        setActionLoading(`vote-${proposalId}`);
        setError('');
        setSuccess('');

        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, signer);
            const tx = await dao.vote(proposalId, support);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess(`✅ Голос ${support ? 'ЗА' : 'ПРОТИВ'} записан!`);
            loadProposals();
        } catch (err) {
            console.error('Vote error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleExecute = async (proposalId) => {
        if (!signer) return;
        setActionLoading(`execute-${proposalId}`);
        setError('');
        setSuccess('');

        try {
            const dao = new Contract(DAO_ADDRESS, OnionDAOABI.abi, signer);
            const tx = await dao.execute(proposalId);
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Предложение исполнено!');
            loadProposals();
        } catch (err) {
            console.error('Execute error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const isProposalActive = (deadline) => {
        return Date.now() / 1000 < deadline;
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('ru-RU');
    };

    const canVote = parseFloat(stakedAmount) >= parseFloat(minStakeToVote);

    if (!account) {
        return (
            <div className="card">
                <h3 className="card-title">🪙 Токены</h3>
                <div className="empty-state">
                    <p>Подключите кошелёк чтобы использовать DAO</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title">🪙 Токены ONT</h3>

            {loading ? (
                <div className="loading">
                    <span className="spinner"></span>
                    Загрузка...
                </div>
            ) : (
                <>
                    <div className="dao-sections">
                        <div className="dao-section">
                            <h4>💰 Баланс ONT</h4>
                            <div className="stat-row">
                                <span className="stat-label">Баланс:</span>
                                <span className="stat-value">{parseFloat(ontBalance).toFixed(2)} ONT</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Застейкано:</span>
                                <span className="stat-value">{parseFloat(stakedAmount).toFixed(2)} ONT</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Voting Power:</span>
                                <span className="stat-value">{parseFloat(votingPower).toFixed(2)}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Eligible ({minBalanceToVote}+ ONT):</span>
                                <span className="stat-value">{isEligible ? '✅ Да' : '❌ Нет'}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Can Vote ({minStakeToVote}+ staked):</span>
                                <span className="stat-value">{canVote ? '✅ Да' : '❌ Нет'}</span>
                            </div>
                        </div>

                        <div className="dao-section">
                            <h4>✅ Approve для DAO</h4>
                            <div className="inline-form">
                                <div className="form-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="ONT"
                                        value={approveAmount}
                                        onChange={(e) => setApproveAmount(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                </div>
                                <button
                                    className="btn btn-secondary btn-small"
                                    onClick={handleApprove}
                                    disabled={actionLoading || !approveAmount}
                                >
                                    {actionLoading === 'approve' ? <span className="spinner"></span> : 'Approve'}
                                </button>
                            </div>
                        </div>

                        <div className="dao-section">
                            <h4>📥 Стейкинг</h4>
                            <div className="inline-form">
                                <div className="form-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="ONT"
                                        value={stakeAmount}
                                        onChange={(e) => setStakeAmount(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary btn-small"
                                    onClick={handleStake}
                                    disabled={actionLoading || !stakeAmount}
                                >
                                    {actionLoading === 'stake' ? <span className="spinner"></span> : 'Stake'}
                                </button>
                            </div>
                        </div>

                        <div className="dao-section">
                            <h4>📤 Анстейк</h4>
                            <div className="inline-form">
                                <div className="form-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="ONT"
                                        value={unstakeAmount}
                                        onChange={(e) => setUnstakeAmount(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                </div>
                                <button
                                    className="btn btn-secondary btn-small"
                                    onClick={handleUnstake}
                                    disabled={actionLoading || !unstakeAmount}
                                >
                                    {actionLoading === 'unstake' ? <span className="spinner"></span> : 'Unstake'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <h4 style={{ marginBottom: '16px', color: 'var(--accent-secondary)' }}>📝 Создать предложение</h4>
                        <div className="form-group">
                            <label>Описание</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Описание предложения..."
                                value={proposalDescription}
                                onChange={(e) => setProposalDescription(e.target.value)}
                                disabled={actionLoading}
                            />
                        </div>
                        <div className="inline-form">
                            <div className="form-group">
                                <label>Длительность (мин)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="60"
                                    value={proposalDuration}
                                    onChange={(e) => setProposalDuration(e.target.value)}
                                    disabled={actionLoading}
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-small"
                                onClick={handleCreateProposal}
                                disabled={actionLoading || !proposalDescription || !proposalDuration}
                                style={{ marginTop: '24px' }}
                            >
                                {actionLoading === 'createProposal' ? <span className="spinner"></span> : 'Создать'}
                            </button>
                        </div>
                    </div>

                    <div className="proposals-list">
                        <h4 style={{ marginBottom: '16px', color: 'var(--accent-secondary)' }}>📋 Предложения ({proposals.length})</h4>

                        {proposals.length === 0 ? (
                            <div className="empty-state">
                                <p>Предложений пока нет</p>
                            </div>
                        ) : (
                            proposals.map((p) => (
                                <div key={p.id} className="proposal-card">
                                    <div className="proposal-header">
                                        <span className="proposal-id">#{p.id}</span>
                                        <span className={`proposal-status ${p.executed ? 'executed' : isProposalActive(p.deadline) ? 'active' : 'ended'}`}>
                                            {p.executed ? 'Исполнено' : isProposalActive(p.deadline) ? 'Активно' : 'Завершено'}
                                        </span>
                                    </div>
                                    <div className="proposal-description">{p.description}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B6B6B', marginBottom: '8px' }}>
                                        Дедлайн: {formatDate(p.deadline)}
                                    </div>
                                    <div className="proposal-votes">
                                        <span className="vote-count for">👍 ЗА: {parseFloat(p.yesVotes).toFixed(0)}</span>
                                        <span className="vote-count against">👎 ПРОТИВ: {parseFloat(p.noVotes).toFixed(0)}</span>
                                    </div>
                                    <div className="proposal-actions">
                                        {isProposalActive(p.deadline) && (
                                            <>
                                                <button
                                                    className="btn btn-success btn-small"
                                                    onClick={() => handleVote(p.id, true)}
                                                    disabled={actionLoading || !canVote}
                                                >
                                                    {actionLoading === `vote-${p.id}` ? <span className="spinner"></span> : '👍 ЗА'}
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-small"
                                                    onClick={() => handleVote(p.id, false)}
                                                    disabled={actionLoading || !canVote}
                                                >
                                                    {actionLoading === `vote-${p.id}` ? <span className="spinner"></span> : '👎 ПРОТИВ'}
                                                </button>
                                            </>
                                        )}
                                        {!isProposalActive(p.deadline) && !p.executed && (
                                            <button
                                                className="btn btn-primary btn-small"
                                                onClick={() => handleExecute(p.id)}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading === `execute-${p.id}` ? <span className="spinner"></span> : '⚡ Execute'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        className="btn btn-secondary btn-small"
                        onClick={loadData}
                        style={{ marginTop: '16px' }}
                        disabled={loading}
                    >
                        🔄 Обновить данные
                    </button>
                </>
            )}

            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}
        </div>
    );
}
