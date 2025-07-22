# Solana Token Contract Interaction Tool

这是一个Solana的anchor合约工程，用于部署token相关的合约，该合约支持的功能有

- ✨ 创建带元数据的SPL Token
- 🏭 铸造Token到指定地址
- 💸 在地址间转移Token

在使用`anchor`命令部署完后，交互的命令参考`INTERACT.md`


### 如何重新生成 program id

- 删除现有的 program id对应的私钥文件: `rm -rf target/deploy/transfer_tokens-keypair.json`
- 运行并重新生成新的私钥文件 `anchor clean && anchor build`
- 使用anchor命令查看: `anchor keys list`
- 更新program id: `anchor keys sync`
- 重新rebuild: `anchor build`

