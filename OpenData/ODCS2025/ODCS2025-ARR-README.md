---
---
# ODCS2025-ARR-README

## General Information

This README file (`ODCS2025-ARR-README.md`) was created by Daryl Hepting and Alain Maubert Crotte.

The format of the README file follows [https://data.research.cornell.edu/data-management/sharing/readme/].

### Dataset Title

Open Data Community Survey 2025 Anonymized Raw Responses (ODCS2025-ARR)

All responses were collected anonymously, however some respondents added identifying information in their responses, which has been removed.

### Investigator Information

Daryl Hepting

* Professor of Computer Science, University of Regina, 3737 Wascana Parkway, Regina, SK, S4S 0A2, Canada
* email: <daryl.hepting@uregina.ca>
* ORCID: [https://orcid.org/0000-0002-3138-3521/]
* website: [https://www2.cs.uregina.ca/~hepting/]

Alain Maubert Crotte

* PhD Student, Department of Computer Science, University of Regina, 3737 Wascana Parkway, Regina, SK, S4S 0A2, Canada
* email: <Alain.MaubertCrotte@uregina.ca>
* ORCID: [https://orcid.org/0000-0002-5261-4392/]

### Dates of Data Collection

2025-03-27 to 2025-06-15 (end of day, Anywhere on Earth)

### Geographic Location of Data Collection

Online (using Qualtrics)

### Keywords

open data

### Language

English

### Funding

Funding for this survey has been provided by the DDI (Data Documentation Initiative) Alliance, an international collaboration dedicated to developing metadata standards and semantic products for describing social science data, data covering human activity, and other data based on observational methods.

## Data and File Overview

* `ODCS2025-ARR.csv`

  * Comma Separated Values format
  * Published on 2025-08-29
  * This file contains raw data for each respondent. Details about the data are discussed in the "Methodological information" and "Data-specific information" sections that follow.

* `ODCS2025-consent.md`

  * Markdown format
  * Published on 2025-08-29
  * This file contains a markdown-formatted version of the [consent form](https://www2.cs.uregina.ca/~hepting/projects/open-data/community-survey-2025/survey-participant-information-and-consent-form.pdf)

* `ODCS2025-questions.md`

  * Markdown format
  * Published on 2025-08-29
  * This file contains the questions asked in the survey in a layout similar to the survey. The numbering of questions matches the variable names found in the "Variable list" section later in this file, which also indicates allowable values for each.

* `ODCS2025-ARR-README.md` (this file)

  * Markdown format
  * Published on 2025-08-29
  * This file contains a description of the ODCS2025-ARR dataset

## Sharing and Access Information

### Licenses or restrictions placed on the data

![Creative Commons Attribution 4.0 International License][CC-BY-4.0-img]
[Creative Commons Attribution 4.0 International License][CC-BY-4.0]

### Links to publications that cite or use the data

### Links to other publicly accessible locations of the data

* [https://www2.cs.uregina.ca/~hepting/OpenData/ODCS2025/](https://www2.cs.uregina.ca/~hepting/OpenData/ODCS2025/)

### Recommended citation for the data

See the citation information in borealisdata.ca for the dataset

## Methodological Information

### Research Ethics Board (REB)

The survey was approved by the Research Ethics Board (REB) at the University of Regina in Regina, Canada. Respondents were asked to give broad consent because the data might be used by other researchers to complete new analyses.

### Snowball Sampling

Emails were sent to a number of mailing lists to invite participation and to encourage sharing of the invitation with others. A question on the survey (`Q017AT_OD-Resources`) asked "Please list the websites, email lists, groups, and professional societies that you access in your work with open data" and the responses to this question were used to identify new mailing lists and communities to invite.

### Qualtrics Configuration

The survey was collected through Qualtrics Experience Management (XM).

All respondents used the 'anonymous' distribution channel as indicated in Qualtrics. Respondents had the ability to complete the survey over multiple sessions on the same browser. Qualtrics was configured to submit incomplete responses after 2 weeks of inactivity, therefore some of the data for respondents is incomplete. Respondents may have declined to answer certain questions, also leading to incomplete data. For questions that involved selection amongst alternatives, the labels (i.e. "Strongly agree") are stored instead of the numerical code value. For questions that involved text entry, the full responses are stored with the exception that identifying elements such as email addresses, names, or personal websites were redacted. For either question type, blank cells indicate no response.

Removed from the data file were cases/rows created through the survey preview as well as some columns recorded by Qualtrics that did not impact the responses.

Qualtrics provided 2 variables that have been maintained in the raw data file: `S_ID` (originally a 16 character alphanumeric string) was converted into a integer to identify the respondents sequentially and `S_RecaptchaScore` that is real-valued [0,1] with higher values indicating more certainty in the human-ness of the respondent.

### Flow

Respondents were asked (`Q040AS_RespondentPrimaryRole`) if their primary role with open data was as a user, a provider, or both. Respondents were encouraged (but not required) to answer this question and their answer (or lack thereof) determined which question types they saw for the rest of the survey.

| Role |  Question Types Seen |
| :--- | :--- |
| "User" | All (A), User (U) |
| "Provider" | All (A), Provider (P) |
| "Both" | All (A), Provider (P), User (U) |
| No answer | All (A) |

Questions were intended for everyone (A for All), for users (U for User), or for providers (P for Provider). These letters appear in the variable names for each question, described later. Some questions were only available if a preceding question was answered a certain way, so the variable names for these questions have a C (for Conditional).

## Data-specific information

### Numbers of variables and cases/rows

Variables

* S (from survey software): 2
* Q (from survey questions): 107
* Total variables: 109

Cases/rows

* 329 cases (331 rows -- 1: header with column/variable names; 2: question text )

### Variable naming conventions

| Position | Options| Interpretation |
| ---: | :---: | :--- |
| 1        | S, Q   | S from survey software, Q from survey questions |
| 2-4     | 001-107 | Survey question numbers |
| 5        | A, P, U | Is the question for everyone (A), users (U), or providers (P)? |
| 6 | S, M, T | Is the type of answer a selection from provided alternatives (S), multiple selections from provided alternatives (M), or a text entry (T)? |
| 7-10 (optionally) | Cnnn, none | if present in position 7, C indicates that the current question is conditional upon the response to question nnn |
| 7 or 11 | "_" | separator between prefix and descriptive abbreviation of variable contents |

### Data anonymization

We used the data anonimization techniques found in Zenodo's [Documentation and Supporting Material Required for Deposit](https://zenodo.org/records/4042034)

Electronic identifiers such as web addresses and email addresses are direct identifiers, which can lead to identification of the respondents. Therefore email addresses and personal website addresses were removed from the responses to the text entry style of questions.

### Variable list

See the file [`ODCS2025-questions.md`](
  {% link OpenData/ODCS2025/ODCS2025-questions.md %}) for question text.

| Variable Name | Column | Allowable Values (in addition to "") |
| :--- | :---: | :--- |
| `S_ID`         | A | Integer 1 - 329 (sequential ordering) |
| `S_RecaptchaScore`| B | Real value [0,1] (provided by Qualtrics) |
| `Q001AS_AgeRange` | C | "17 or younger", "18-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75 or older" |  
| `Q002AT_Gender` | D | Text |
| `Q003AS_Education` | E | "Secondary Diploma or Equivalent", "Post-secondary certificate", "Undergraduate degree", "Graduate degree", "Professional degree" |
| `Q004AS_Country` | F | Textual name of country from Qualtrics dropdown list |
| `Q005AS_OpenDataExp` | G | "Novice", "Advanced beginner", "Proficient", "Expert" |
| `Q006AS_SemanticMetadataExp` | H | "Novice", "Advanced beginner", "Proficient", "Expert" |  
| `Q007AS_OrgType` | I | "Government, Public Sector", "Enterprise, Private Sector", "Academia", "Non-Governmental Organization (NGO)", "None (my interest in open data is as a private citizen)" |
| `Q008ATC007_OrgName` | J | Text |  
| `Q009ATC007_OrgWebsite`  | K | Text |
| `Q010ASC007_OrgPublishesStandards` | L | "Never", "Rarely", "Often", "Always" |
| `Q011ASC007_OrgUsesStandards` | M | "No", "Yes" |  
| `Q012ATC011_OrgStandardsDesc` | N | Text |
| `Q013ATC007_OrgHelpStandards` | O | Text |
| `Q014AS_OD-WorkFreq` | P | "Never", "Rarely", "Often", "Always" |
| `Q015AS_OD-WorkFraction` | Q | "None", "Little", "Much", "All", "Unsure" |
| `Q016AS_OD-LackTechSupport` | R | "Never", "Rarely", "Often", "Always" |
| `Q017AT_OD-Resources`  | S | Text |
| `Q018AS_OD-Familiarity5StarLOD` | T | "Very unfamiliar", "Somewhat unfamiliar", "Somewhat familiar", "Very familiar" |
| `Q019AS_OD-FamiliarityFAIR`  | U | "Very unfamiliar", "Somewhat unfamiliar", "Somewhat familiar", "Very familiar" |
| `Q020AS_OD-FamiliarityODCharter` | V | "Very unfamiliar", "Somewhat unfamiliar", "Somewhat familiar", "Very familiar" |
| `Q021AS_OD-FamiliaritySebastopolOpenGov` | W | "Very unfamiliar", "Somewhat unfamiliar", "Somewhat familiar", "Very familiar" |
| `Q022AS_OD-FamiliarityMetadataStandards` | X | "Very unfamiliar", "Somewhat unfamiliar", "Somewhat familiar", "Very familiar" |
| `Q023AS_OD-Accessibility` | Y | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q024AS_OD-AI-Ready`  | Z | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q025AS_OD-TechOpenness`  | AA | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q026AS_OD-LegalOpenness`  | AB | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q027AS_OD-CommercialOpenness`  | AC | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q028AS_OD-NonOpenFAIR`  | AD | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q029AS_OD-DataSovereignty`  | AE | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q030AS_OD-Transparency`  | AF | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q031AS_OD-EconomicGrowth`  | AG | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q032AS_OD-PublicAwareness`  | AH | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q033AS_OD-DataDemocratization`  | AI | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q034AS_OD-ProviderControlAI-IoT`  | AJ | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q035AS_OD-PreventMisuseAI`  | AK | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q036AS_OD-GenAI-UntrustworthyData`  | AL | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q037AS_OD-Trust`  | AM | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q038AS_OD-NonOpenTrust` | AN | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q039AS_OD-FAIR-MetadataImprovesTrust`  | AO | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q040AS_RespondentPrimaryRole` | AP | "User", "Provider", "Both (User and Provider)" |
| `Q041US_TimeSpentUsingOD` | AQ | "None", "Little", "Much", "All" |
| `Q042UM_DataQualityAspects` | AR | "Completeness (spatial / temporal / demographic)", "Consistency (uniformity within the dataset)", "Lack of bias (no systematic 'tilt')", "Timeliness (speed of data release)", "Provenance & Integrity (unchanged from a trusted source)" |
| `Q043US_AvgDataQuality` | AS | "Very poor", "Poor", "Good", "Very Good" |
| `Q044US_MetadataQualityDataQuality` | AT | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q045US_ValidEmailsUrlsDataQuality` | AU | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q046US_OpenDataPrinciplesDataQuality`  | AV | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q047US_DataMetadataQualityProblems` | AW | "Never", "Rarely", "Often", "Always" |
| `Q048US_LegalProblemsLicenses` | AX | "Never", "Rarely", "Often", "Always" |
| `Q049UT_MostUsedSource` | AY | Text |
| `Q050UT_MostUsedPurpose`  | AZ | Text |
| `Q051UT_MostUsedProgLang`  | BA | Text |
| `Q052UT_MostUsedStandards` | BB | Text |
| `Q053US_MostUsedUseData` | BC | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q054US_MostUsedReuseData` | BD | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q055US_MostUsedEasyAccess` | BE | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q056PS_TimeSpentProvidingOD` | BF | "None", "Little", "Much", "All" |
| `Q057PS_SelectFormatsUsedPublish` | BG | "CSV", "RDF", "Other (please specify)" |
| `Q058PTC057_OtherFormatsUsedPublish` | BH | Text |
| `Q059PS_PrivacySecurityConcerns` | BI | "Never", "Rarely", "Often", "Always" |
| `Q060PS_StrategicBusinessConcerns` | BJ | "Never", "Rarely", "Often", "Always" |
| `Q061PS_LegalConstraints` | BK | "Never", "Rarely", "Often", "Always" |
| `Q062PS_TechnicalBarriers` | BL | "Never", "Rarely", "Often", "Always" |
| `Q063PS_InteropMetadataChallenges` | BM | "Never", "Rarely", "Often", "Always" |  
| `Q064PS_MetadataToolChallenges` | BN | "Never", "Rarely", "Often", "Always" |
| `Q065PS_MetadataInteropReuse`  | BO | "Very unimportant", "Somewhat unimportant", "Somewhat important", "Very important" |
| `Q066PS_FP-PersistentIdentImportant` | BP | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q067PS_FP-PersistentIdentEasy` | BQ | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q068PS_FP-RichMetadataImportant` | BR | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q069PS_FP-RichMetadataEasy` | BS | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q070PS_FP-MetaDataIdentImportant` | BT | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q071PS_FP-MetaDataIdentEasy` | BU | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q072PS_FP-MetaDataIndexImportant` | BV | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q073PS_FP-MetaDataIndexEasy` | BW | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q074PS_FP-MetaDataProtocolImportant`  | BX | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q075PS_FP-MetaDataProtocolEasy` | BY | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q076PS_FP-ProtocolOpenImportant` | BZ | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q077PS_FP-ProtocolOpenEasy` | CA | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q078PS_FP-ProtocolAuthImportant` | CB | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q079PS_FP-ProtocolAuthEasy` | CC | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q080PS_FP-MetadataWithoutDataImportant`  | CD | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q081PS_FP-MetadataWithoutDataEasy` | CE | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q082PS_FP-SharedKnowledgeRepImportant` | CF | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q083PS_FP-SharedKnowledgeRepEasy` | CG | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q084PS_FP-VocabulariesImportant` | CH | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q085PS_FP-VocabulariesEasy` | CI | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q086PS_FP-QualifiedReferencesImportant` | CJ | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q087PS_FP-QualifiedReferencesEasy` | CK | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q088PS_FP-RichlyDescribedImportant` | CL | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q089PS_FP-RichlyDescribedEasy`  | CM | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q090PS_FP-ClearAccessibleLicenseImportant` | CN | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q091PS_FP-ClearAccessibleLicenseEasy` | CO | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q092PS_FP-DetailedProvImportant`  | CP | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q093PS_FP-DetailedProvEasy` | CQ | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q094PS_FP-DomainStandardsImportant`  | CR | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q095PS_FP-DomainStandardsEasy`| CS | "Strongly disagree", "Somewhat disagree", "Somewhat agree", "Strongly agree" |
| `Q096PT_MostRecentProjectName` | CT | Text |
| `Q097PT_MostRecentURLorDesc` | CU | Text |
| `Q098PT_MostRecentStartDate` | CV | Text |
| `Q099PT_MostRecentEndDate`  | CW | Text |
| `Q100PT_MostRecentGoal` | CX | Text |
| `Q101PT_MostRecentEvaluationSuccess` | CY | Text |
| `Q102PT_MostRecentTools` | CZ | Text |
| `Q103PT_Advice` | DA | Text |
| `Q104AT_PolicyToolGaps` | DB | Text |  
| `Q105AT_BiggestThreatDataQuality` | DC | Text |  
| `Q106AT_AdditionalComments` | DD | Text |
| `Q107AS_ConfirmSubmitIntent` | DE | "No, I wish to withdraw my consent - don't submit my responses", "Yes, I confirm that I want to participate - please submit my responses" |
| `Q108ASC107_ConfirmWithdrawalIntent` | DF | "No, submit my responses", "Yes, do not submit my responses" |

[https://www2.cs.uregina.ca/~hepting/]: https://www2.cs.uregina.ca/~hepting/
[https://orcid.org/0000-0002-5261-4392]: https://orcid.org/0000-0002-5261-4392
[https://orcid.org/0000-0002-3138-3521]: https://orcid.org/0000-0002-3138-3521
[https://data.research.cornell.edu/data-management/sharing/readme/]: https://data.research.cornell.edu/data-management/sharing/readme/#1-recommended-content
[CC-BY-4.0-img]: https://licensebuttons.net/l/by/4.0/88x31.png
[CC-BY-4.0]: http://creativecommons.org/licenses/by/4.0
