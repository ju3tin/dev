#!/usr/bin/env node

import { Command } from 'commander';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@project-serum/anchor';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

const PROGRAM_ID = new PublicKey('5ffMSBwMFAi7Du5eY2ChdtCxqPzRNznz8ahYQeKMctEg');
const IDL = JSON.parse(fs.readFileSync(path.join(__dirname, '../idl/crash123a.json'), 'utf8'));

program
  .name('initialize-crash-game')
  .description('Initialize the Crash Game on Solana (run once)')
  .option('-k, --keypair <path>', 'Path to wallet keypair', '~/.config/solana/id.json')
  .option('-u, --url <url>', 'RPC URL', 'https://api.devnet.solana.com')
  .action(async (options) => {
    try {
      console.log('Initializing Crash Game...');

      // Load wallet
      const keypairPath = options.keypair.replace('~', require('os').homedir());
      const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
      const wallet = Keypair.fromSecretKey(secretKey);

      // Connection + Provider
      const connection = new Connection(options.url, 'confirmed');
      const provider = new AnchorProvider(connection, { publicKey: wallet.publicKey, signTransaction: async (tx) => tx }, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      // PDAs
      const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId);
      const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault')], program.programId);

      console.log('Admin:', wallet.publicKey.toBase58());
      console.log('Config PDA:', configPda.toBase58());
      console.log('Vault PDA:', vaultPda.toBase58());

      // Initialize
      const tx = await program.methods
        .initialize(wallet.publicKey)
        .accounts({
          config: configPda,
          vault: vaultPda,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc();

      console.log('SUCCESS!');
      console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      console.log('You are now the ADMIN. Game is ready!');
    } catch (error: any) {
      console.error('FAILED:', error.message);
      if (error.logs) console.error(error.logs.join('\n'));
      process.exit(1);
    }
  });

program.parse();