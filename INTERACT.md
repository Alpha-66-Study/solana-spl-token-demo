# Token Contract Interaction Tool

这是一个用于与Solana上部署的Token合约进行交互的TypeScript工具。支持在devnet网络上进行token创建、铸造和转账操作。

## 功能特性

- ✨ 创建带元数据的SPL Token
- 🏭 铸造Token到指定地址
- 💸 在地址间转移Token
- 💰 查询Token和SOL余额
- 🎭 完整的演示流程

## 部署合约到dev网络

```bash

anchor deploy --provider.cluster devnet  

anchor deploy --provider.cluster https://shy-empty-bridge.solana-devnet.quiknode.pro/01d7d4aef2eade46994e08e719a8655123cd1142/

```

## 安装依赖

```bash
yarn install
```

## 配置

1. 确保你有Solana钱包配置在 `~/.config/solana/id.json`
2. 确保钱包在devnet上有足够的SOL用于交易费用

获取devnet SOL:
```bash
solana airdrop 2 --url devnet
```

## 使用方法

### 命令行界面

#### 基本语法
```bash
yarn interact <command> [options]
```

#### 可用命令

1. **创建Token**
   ```bash
   yarn interact create "My Token" "MTK" "https://example.com/metadata.json"
   ```

2. **铸造Token**
   ```bash
   yarn interact mint <mint_address> <recipient_address> <amount>
   ```

3. **转移Token**
   ```bash
   yarn interact transfer <mint_address> <recipient_address> <amount>
   ```

4. **查询Token余额**
   ```bash
   yarn interact balance <mint_address> [owner_address]
   ```

5. **查询SOL余额**
   ```bash
   yarn interact sol-balance [address]
   ```

6. **运行完整演示**
   ```bash
   yarn demo
   ```

### 完整示例

```bash
# 1. 创建一个新的token
yarn interact create "Demo Coin" "DEMO" "https://raw.githubusercontent.com/solana-developers/program-examples/main/tokens/tokens/.assets/spl-token.json"

# 2. 铸造1000个token到自己的地址
yarn interact mint 7XH3GvD4R9XAnoikTJe7uqeewgVG8gF5L4Zi1rvFh4Qc <your_wallet_address> 1000

# 3. 转移100个token到其他地址
yarn interact transfer 7XH3GvD4R9XAnoikTJe7uqeewgVG8gF5L4Zi1rvFh4Qc <recipient_address> 100

# 4. 查询余额
yarn interact balance 7XH3GvD4R9XAnoikTJe7uqeewgVG8gF5L4Zi1rvFh4Qc
```

## 编程方式使用

你也可以在你的TypeScript代码中导入和使用`TokenInteractor`类：

```typescript
import { TokenInteractor } from './interact';

async function example() {
  const interactor = new TokenInteractor();
  
  // 创建token
  const { mintAddress } = await interactor.createToken(
    'My Token',
    'MTK',
    'https://example.com/metadata.json'
  );
  
  // 铸造token
  await interactor.mintToken(mintAddress, recipientAddress, 1000);
  
  // 转移token
  await interactor.transferTokens(mintAddress, recipientAddress, 100);
  
  // 查询余额
  const balance = await interactor.getTokenBalance(mintAddress, ownerAddress);
  console.log(`Balance: ${balance}`);
}
```

## 网络配置

默认连接到devnet。如果需要连接到其他网络，修改`interact.ts`中的`NETWORK`常量：

```typescript
const NETWORK = 'devnet'; // 或 'testnet', 'mainnet-beta'
```

## 错误处理

脚本包含详细的错误处理和日志输出：
- ✅ 成功操作会显示绿色勾号和交易链接
- ❌ 失败操作会显示红色X和错误信息
- 🔗 所有交易都会提供Solana Explorer链接

## 注意事项

1. **Metadata程序**: 在本地测试环境中，metadata程序可能不可用，createToken操作可能会失败
2. **网络费用**: 每次交易都需要少量SOL作为网络费用
3. **确认时间**: 交易可能需要几秒钟确认，脚本会等待确认
4. **地址格式**: 确保所有地址都是有效的Solana公钥格式

## 故障排除

1. **钱包文件不存在**
   ```bash
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

2. **SOL余额不足**
   ```bash
   solana airdrop 2 --url devnet
   ```

3. **Program ID不匹配**
   - 确保`PROGRAM_ID`与你部署的合约地址匹配
   - 检查`Anchor.toml`中的program ID

4. **IDL文件缺失**
   ```bash
   anchor build
   ```