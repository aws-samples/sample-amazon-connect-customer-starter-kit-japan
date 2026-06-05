# sample-amazon-connect-customer-starter-kit-japan

## お知らせ
※ us-east-1/ap-northeast-1 の両方でデプロイ可能になりました。

## バージョン情報
**v2.0.7** (2026年6月)

## 更新情報
2026年6月
- 更新内容
  - デプロイメントガイドの記載内容を Amazon Connect Customer に更新
  - コンタクトフローモジュールを更新し、コンタクト後の会話要約の日本語対応を反映
  - オペレータとセルフサービス用の評価フォームとルールの設定を新規に追加し、生成 AI による会話の自動評価（日本語対応）を反映
  - オーケストレーションタイプの AI プロンプトについて、![AI プロンプトのキャッシュ最適化](https://docs.aws.amazon.com/ja_jp/connect/latest/adminguide/create-ai-prompts.html#guidelines-optimize-prompt)を実施

2026年5月
- 更新内容
  - AI エージェント(AgentAssistanceOrchestration-jpn) がケース更新リクエスト（件名と概要）に対応(UpdateCase,GetContactAttributes ツールを追加)
  - AI エージェント(RecommendationAIAgentAIAgent-jpn) が推奨メッセージに対応（会話要約、ケース更新等の推奨メッセージの設定手順を追加）
  - コンタクトフロー(AC_PKG_self_service_to_agent_Inbound_flow) に AI ボットの対応要約を反映したケースポップアップ処理を追加
  - AI エージェントのツールに Amazon Bedrock AgentCore を使用した MCP サーバーを追加する手順を反映（オプションで手順書に従って設定する事で動作確認可能）

## 目次
- [バージョン情報](#バージョン情報)
- [本パッケージについて](#本パッケージについて)
- [解決可能な課題](#解決可能な課題)
- [主要機能/特徴](#主要機能特徴)
- [アーキテクチャー](#アーキテクチャー)
- [導入ガイド](#導入ガイド)
- [サポートとフィードバック](#サポートとフィードバック)

## 本パッケージについて

- 本パッケージ(sample-amazon-connect-customer-starter-kit-japan)は、コンタクトセンターを運営する企業向けに開発された、Amazon Connect Customer の導入・デプロイを支援する統合ソリューションです。
- 本パッケージの最大の特徴は、デプロイするだけで最新の AI 機能を活用したコンタクトセンター環境が即座に利用可能になる点です。Amazon Connect AI エージェントを中心に、音声・チャットの複数チャネルに対応した環境が自動的に構築されます。複雑な設定作業は不要で、付属のデプロイメントガイドに従うだけで環境が完成します。
- Amazon Connect Customer の AI エージェントは、従来の Amazon Q in Connect から進化した、より高度な自律型 AI です。顧客は「Connect アシスタント」と呼ばれる会話型インターフェイスを通じて AI エージェントとやり取りし、複雑でオープンエンドな問い合わせにも対応できます。ナレッジベースを参照した自動応答、複数の意図を含む問い合わせへの対応、コンテキストを維持した会話など、最新の Agentic AI 機能を実際に体験できます。

## 解決可能な課題

- 従来、コンタクトセンターシステムの導入には、複数のツールの統合や技術的な専門知識が必要とされ、多大な時間とコストが発生していました。特に、AI 機能の導入や CRM 連携には高度な技術力だけでなく実装に必要な期間もかかるため、ユーザーにとって大きな負担となっていました。これらの課題に対し、Amazon Connect Customer に備わった各機能を利用開始するために必要な事前設定も自動化することで、利用者は初期設定済みの環境をもとに、Amazon Connect Customer の利用を開始できます。

## 主要機能/特徴
- Amazon Connect Customer は、あらゆるタッチポイントで顧客を関与させ、より深い関係を構築することを可能にするエージェンティック AI ソリューションです。
- Amazon Connect Customer にはコンタクトセンター運営に必要な主要機能が多く備わっています。本パッケージの利用により、コールフローに関しては、直収、agentic voice によるセルフサービス(Lex と AI agents の統合)のフローテンプレートが提供されます。各テンプレートには、会話の文字おこしなど応対品質の向上に役立つ 会話分析の初期設定や、2025年～2030年の祝日カレンダーが組み込まれています。さらに、事前設定済みの Customer Profiles と Cases は、顧客データと応対履歴の管理機能の利用をすぐに可能です。また、エージェントが利用するエージェントワークスペース(ソフトフォン)を拡張する 3rd Party App(発信者ID番号選択、通話履歴、コール情報表示など)や、AI agents、Connect Assitant(エージェントアシスト)の初期設定も含まれます。

![CX_And_Built-in-AI](docs/images/FCD_BuiltInAI.jpg)

### 画面イメージ

![AgentUI](docs/images/CCP_AgentWorkspace1.jpg)
![AgentUI](docs/images/CCP_AgentWorkspace3.jpg)
![AgentUI](docs/images/CCP_AgentWorkspace4.jpg)
![AgentUI](docs/images/CCP_AgentWorkspace5.jpg)

## アーキテクチャー

### 概要図
![Architecture](docs/images/Architecture.jpg)

### 利用する AWS サービス
- Amazon Connect Customer
- Amazon Lex
- AWS Lambda
- Amazon CloudFront
- AWS WAF
- Identity and Access Management (IAM)
- Amazon S3
- AWS CloudFormation

### デプロイされるリソース
- Amazon Connect Customer: Amazon Connect Customer のインスタンスが新規にデプロイされます。オプションで既存の Amazon Connect Customer のインスタンスを使用することも可能です。
- Amazon S3: 以下の4つの S3 バケットが作成されます:
  - amazonconnect-[InstanceAliace]: Amazon Connect Customer のストレージ用バケットです。通話録音ファイル等が格納されます。
  - amazonconnect-[InstanceAliace]-app: 本パッケージの構成ファイルが保存され、また、エージェントワークスペースの拡張機能(MyConnectApp)の Web アプリケーションソース一式を格納します。
  - amazonconnect-[InstanceAliace]-aiagents: Amazon Connect AI Agents が参照するナレッジソースの格納先となるバケットです。
  - amazonconnect-[InstanceAliace]-logs: S3 バケットのアクセスログ、Amazon CloudFront のアクセスログの格納先となるバケットです。
- Amazon CloudFront: エージェントワークスペースの拡張機能（MyConnectApp）を配信するための CDN として使用します。
- AWS WAF: CloudFront ディストリビューションに AWS WAF を統合し、Web アプリケーションを保護します。※ us-east-1 の場合自動で適用
- Amazon Lex: セルフサービスを提供するための音声ボットサービスです。Amazon Connect Customer のコンタクトフローから連携され、ナレッジソース参照のため Amazon Connect AI Agents と連携します。
- AWS Lambda: サンプルコンタクトフローをデプロイするためのリソース参照用の AWS Lambda です。AWS CloudFormation によるデプロイ時のみ利用します。本パッケージの動作では利用しません。

## 導入ガイド

### 前提条件

- 前提知識
  - AWS マネジメントコンソールへログインし、基本的な画面操作ができる
  - Amazon Connect Customer の管理コンソールへログインし、基本的な画面操作ができる

- 必要な権限
  - このパッケージをデプロイするには、以下の権限が必要です。
  - AWS管理ポリシー「AdministratorAccess」が付与されたIAMユーザー/ロール、もしくは同等の権限
    - Amazon Connect Customer のインスタンス作成権限
    - AWS CloudFormation によるリソースのデプロイ権限
    - IAM ロールおよびポリシーの作成権限
    - Amazon S3 バケットの作成権限
    - Amazon CloudFront ディストリビューションの作成権限
    - AWS Lambda 関数の作成権限
    - AWS WAF の作成権限

- システム要件
  - 本パッケージの対応リージョンは 東京リージョン(ap-northeast-1)またはバージニア北部リージョン(us-east-1)です。

### デプロイ手順

上から順に進み、手順を実施してください。

1.  デプロイメントガイドをダウンロード:[**こちら**](docs/other_docs/AmazonConnectCustomerPackage_DeploymentGuide_20260605.pdf)
1.  パラメーターシートをダウンロード:[**こちら**](docs/other_docs/AmazonConnectCustomerPackage_ParameterSheet.xlsx)
1.  デプロイモジュールをダウンロード:[**こちら**](docs/other_docs/amazon-connect-project.zip)
1.  デプロイメントガイドに従い作業を実施
    - 作業の流れは以下の通りです。動作確認含めて約1.5時間かかる想定です。
    - 事前準備: パラメーターシートの作成			[15分]
    - ステップ1: 環境の初期構築 (CloudFormation)		[10分 (デプロイ待ちの約2分含む) ]    
    - ステップ2: 環境初期設定					[10分]
    - ステップ3: 各種リソース追加 (CloudFormation)		[15分 (デプロイ待ちの約10分含む)]
    - ステップ4: 環境の確認と追加設定				[20分]
    - 動作確認							[30分]

## 主な費用

### Amazon Connect Customer
Amazon Connect Voice では、使用に関連して、音声サービスの料金と通信サービス (テレフォニーまたはウェブ通話) の料金の 2 つの料金が発生します。音声サービスの利用料は、1 秒単位 (最低 10 秒) で請求されます。着信通話および CCP(コンタクトコントロールパネル) からダイヤルする手動の発信通話についての Amazon Connect Voice サービスの使用量は、エンドカスタマーがサービスに接続された秒数によって決まります。

### Amazon Connect AI agents
Amazon Connect AI Agents が送受信するチャットメッセージ 1 件につき 0.0015 USD で請求されます。同様に、Amazon Connect AI Agents を有効にした、通話時間 1 分につき 0.008 USD が請求され、最低 10 秒の請求要件があります。Amazon Connect AI Agents をコンタクトのセルフサービス部分に使用された場合、セルフサービスインタラクションの全期間分の料金が請求されます。Amazon Connect Customer でのセルフサービスエクスペリエンスの構築や編集には料金はかかりませんが、Amazon Lex の使用分は別途請求されます。

### Amazon S3
ストレージコストは、FAQドキュメント、チャット記録、およびWebアセットに保存されているデータ量に基づいて決まります。例:米国東部のスタンダードストレージを使用して 50 TB のコンテンツを保存した場合、1 か月あたり 1 GB あたり 0.023 USD を支払うことになります。過去 12 か月間にアカウントを作成し、[AWS 無料利用枠](https://aws.amazon.com/jp/free/?p=ft&z=subnav&loc=1&refid=ft_card&all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free+Tier+Types=*all&awsf.Free+Tier+Categories=categories%23storage&ams%23interactive-card-vertical%23pattern-data-339318104.filter=%257B%2522filters%2522%253A%255B%255D%257D
)の対象となる場合は、1 か月あたり 0.00 USD を支払うことになります。注: Amazon CloudFront は、静的なウェブページを使用してチャットとウェブ通話機能をデモンストレーションする目的でのみ使用されます。実稼働環境では、お客様はこの機能を既存のウェブサイトに実装します。

### その他の プライシングリソース
- [Amazon Connect Customer Pricing Page](https://aws.amazon.com/jp/products/connect/customer/pricing/)
- [AWS Optimization and Licensing Assessment](https://aws.amazon.com/jp/optimization-and-licensing-assessment/)

## サポートとフィードバック
- 本パッケージに関するフィードバックやご報告は、GitHub の Issues 機能をご利用ください。
- Issues 機能は、本リポジトリの 「Issues」タブにある「New Issues」ボタンから操作頂けます。
 
### 報告時のお願い
- バグ報告の場合は、以下の情報を含めていただけると幸いです：
  - 発生している問題の具体的な説明
  - 問題の再現手順
  - 実行環境（AWS リージョン、ブラウザの種類とバージョンなど）
  - エラーメッセージのスクリーンショット（該当する場合）

- 機能改善の提案の場合は、以下の情報を含めていただけると幸いです：
  - 提案する機能の概要
  - その機能が必要な背景や理由
  - 期待する効果

### 注意事項
- 個人情報や機密情報を含める際はご注意ください
- すべての Issue に対して即時の対応を保証するものではありません。また、個別の技術サポートは提供しておりませんので、ご了承ください。
