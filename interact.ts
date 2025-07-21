#!/usr/bin/env ts-node

import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Keypair, PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import type { TransferTokens } from './target/types/transfer_tokens';

// Configuration
const NETWORK = 'devnet'; // Change to 'mainnet-beta' for production
const PROGRAM_ID = new PublicKey('2V3eUpxJK3n1ionrg2xsy5HAVuHzxArnZ3Xg6vbV5Pzb');
const DEV_RPC_URL = 'https://shy-empty-bridge.solana-devnet.quiknode.pro/01d7d4aef2eade46994e08e719a8655123cd1142/'; // Solana  RPC


class TokenInteractor {
  private connection: Connection;
  public wallet: anchor.Wallet;
  private provider: anchor.AnchorProvider;
  private program: anchor.Program<TransferTokens>;

  constructor(secretKeyPath?: string) {
    // Initialize connection
    // this.connection = new Connection(clusterApiUrl(NETWORK), 'confirmed');
    this.connection = new Connection(DEV_RPC_URL, "confirmed");

    
    // Load wallet
    const secretKey = this.loadSecretKey(secretKeyPath);
    const keypair = Keypair.fromSecretKey(secretKey);
    this.wallet = new anchor.Wallet(keypair);
    
    // Setup provider and program
    this.provider = new anchor.AnchorProvider(this.connection, this.wallet, {
      commitment: 'confirmed',
    });
    anchor.setProvider(this.provider);
    
    // Load program IDL
    const idl: TransferTokens = this.loadIDL();
    this.program = new anchor.Program<TransferTokens>(idl, this.provider);
    
    console.log(`🔗 Connected to ${NETWORK}`);
    console.log(`👛 Wallet: ${this.wallet.publicKey.toString()}`);
    console.log(`📋 Program ID: ${PROGRAM_ID.toString()}`);
  }

  private loadSecretKey(secretKeyPath?: string): Uint8Array {
    const keyPath = secretKeyPath || path.join(process.env.HOME || '', '.config/solana/id.json');
    
    try {
      const secretKeyString = fs.readFileSync(keyPath, 'utf8');
      const secretKey = JSON.parse(secretKeyString);
      return new Uint8Array(secretKey);
    } catch (error) {
      throw new Error(`Failed to load secret key from ${keyPath}: ${error}`);
    }
  }

  private loadIDL() {
    try {
      const idlPath = path.join(__dirname, 'target/idl/transfer_tokens.json');
      const idlString = fs.readFileSync(idlPath, 'utf8');
      return JSON.parse(idlString);
    } catch (error) {
      throw new Error(`Failed to load IDL: ${error}`);
    }
  }

  /**
   * Create a new SPL token with metadata
   */
  async createToken(name: string, symbol: string, uri: string): Promise<{
    mintAddress: PublicKey;
    signature: string;
  }> {
    console.log(`\n🪙 Creating token: ${name} (${symbol})`);
    
    const mintKeypair = Keypair.generate();
    console.log(`📍 Mint address: ${mintKeypair.publicKey.toString()}`);

    try {
      const signature = await this.program.methods
        .createToken(name, symbol, uri)
        .accounts({
          payer: this.wallet.publicKey,
          mintAccount: mintKeypair.publicKey,
        })
        .signers([mintKeypair])
        .rpc();

      console.log(`✅ Token created successfully!`);
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);
      
      return {
        mintAddress: mintKeypair.publicKey,
        signature,
      };
    } catch (error) {
      console.error(`❌ Failed to create token:`, error);
      throw error;
    }
  }

  /**
   * Mint tokens to a recipient
   */
  async mintToken(
    mintAddress: PublicKey,
    recipient: PublicKey,
    amount: number
  ): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
    console.log(`\n🏭 Minting ${amount} tokens to ${recipient.toString()}`);
    
    const tokenAccount = getAssociatedTokenAddressSync(mintAddress, recipient);
    console.log(`📍 Token account: ${tokenAccount.toString()}`);

    try {
      const signature = await this.program.methods
        .mintToken(new anchor.BN(amount))
        .accounts({
          mintAuthority: this.wallet.publicKey,
          recipient: recipient,
          mintAccount: mintAddress,
        })
        .rpc();

      console.log(`✅ Tokens minted successfully!`);
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);
      
      return {
        tokenAccount,
        signature,
      };
    } catch (error) {
      console.error(`❌ Failed to mint tokens:`, error);
      throw error;
    }
  }

  /**
   * Transfer tokens between accounts
   */
  async transferTokens(
    mintAddress: PublicKey,
    recipient: PublicKey,
    amount: number
  ): Promise<{
    signature: string;
  }> {
    console.log(`\n💸 Transferring ${amount} tokens to ${recipient.toString()}`);
    
    const senderTokenAccount = getAssociatedTokenAddressSync(mintAddress, this.wallet.publicKey);
    const recipientTokenAccount = getAssociatedTokenAddressSync(mintAddress, recipient);
    
    console.log(`📤 From: ${senderTokenAccount.toString()}`);
    console.log(`📥 To: ${recipientTokenAccount.toString()}`);

    try {
      const signature = await this.program.methods
        .transferTokens(new anchor.BN(amount))
        .accounts({
          sender: this.wallet.publicKey,
          recipient: recipient,
          mintAccount: mintAddress,
        })
        .rpc();

      console.log(`✅ Tokens transferred successfully!`);
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);
      
      return { signature };
    } catch (error) {
      console.error(`❌ Failed to transfer tokens:`, error);
      throw error;
    }
  }

  /**
   * Get token account balance
   */
  async getTokenBalance(mintAddress: PublicKey, owner: PublicKey): Promise<number> {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(mintAddress, owner);
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseInt(balance.value.amount) / Math.pow(10, balance.value.decimals);
    } catch (error) {
      console.log(`Token account not found or error getting balance`);
      return 0;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(publicKey?: PublicKey): Promise<number> {
    const key = publicKey || this.wallet.publicKey;
    const balance = await this.connection.getBalance(key);
    return balance / anchor.web3.LAMPORTS_PER_SOL;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
🚀 Token Contract Interaction Tool

Usage:
  ts-node interact.ts <command> [options]

Commands:
  create <name> <symbol> <uri>              Create a new token
  mint <mint_address> <recipient> <amount>  Mint tokens to recipient
  transfer <mint_address> <recipient> <amount> Transfer tokens
  balance <mint_address> [owner]            Check token balance
  sol-balance [address]                     Check SOL balance
  demo                                      Run a complete demo

Examples:
  ts-node interact.ts create "My Token" "MTK" "https://example.com/metadata.json"
  ts-node interact.ts mint 7XH3G...abc 9WZ4f...xyz 100
  ts-node interact.ts transfer 7XH3G...abc 9WZ4f...xyz 50
  ts-node interact.ts balance 7XH3G...abc
  ts-node interact.ts demo
    `);
    return;
  }

  try {
    const interactor = new TokenInteractor();

    switch (command) {
      case 'create': {
        const [name, symbol, uri] = args.slice(1);
        if (!name || !symbol || !uri) {
          console.error('❌ Missing arguments: create <name> <symbol> <uri>');
          return;
        }
        await interactor.createToken(name, symbol, uri);
        break;
      }

      case 'mint': {
        const [mintStr, recipientStr, amountStr] = args.slice(1);
        if (!mintStr || !recipientStr || !amountStr) {
          console.error('❌ Missing arguments: mint <mint_address> <recipient> <amount>');
          return;
        }
        const mint = new PublicKey(mintStr);
        const recipient = new PublicKey(recipientStr);
        const amount = parseInt(amountStr);
        await interactor.mintToken(mint, recipient, amount);
        break;
      }

      case 'transfer': {
        const [mintStr, recipientStr, amountStr] = args.slice(1);
        if (!mintStr || !recipientStr || !amountStr) {
          console.error('❌ Missing arguments: transfer <mint_address> <recipient> <amount>');
          return;
        }
        const mint = new PublicKey(mintStr);
        const recipient = new PublicKey(recipientStr);
        const amount = parseInt(amountStr);
        await interactor.transferTokens(mint, recipient, amount);
        break;
      }

      case 'balance': {
        const [mintStr, ownerStr] = args.slice(1);
        if (!mintStr) {
          console.error('❌ Missing arguments: balance <mint_address> [owner]');
          return;
        }
        const mint = new PublicKey(mintStr);
        const owner = ownerStr ? new PublicKey(ownerStr) : interactor.wallet.publicKey;
        const balance = await interactor.getTokenBalance(mint, owner);
        console.log(`💰 Token balance: ${balance}`);
        break;
      }

      case 'sol-balance': {
        const [addressStr] = args.slice(1);
        const address = addressStr ? new PublicKey(addressStr) : undefined;
        const balance = await interactor.getSolBalance(address);
        console.log(`💰 SOL balance: ${balance} SOL`);
        break;
      }

      case 'demo': {
        console.log('🎭 Running complete demo...');
        
        // Create token
        const { mintAddress } = await interactor.createToken(
          'Demo Token',
          'DEMO',
          'https://example.com/demo-token.json'
        );
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mint tokens to self
        await interactor.mintToken(mintAddress, interactor.wallet.publicKey, 1000);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate a random recipient
        const recipient = Keypair.generate().publicKey;
        console.log(`\n🎯 Generated recipient: ${recipient.toString()}`);
        
        // Transfer tokens
        await interactor.transferTokens(mintAddress, recipient, 100);
        
        // Check balances
        console.log('\n📊 Final balances:');
        const senderBalance = await interactor.getTokenBalance(mintAddress, interactor.wallet.publicKey);
        const recipientBalance = await interactor.getTokenBalance(mintAddress, recipient);
        console.log(`👛 Sender: ${senderBalance} tokens`);
        console.log(`🎯 Recipient: ${recipientBalance} tokens`);
        
        console.log('\n🎉 Demo completed successfully!');
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        break;
    }
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { TokenInteractor };

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}