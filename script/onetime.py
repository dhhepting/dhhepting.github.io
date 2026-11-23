#!/usr/bin/env python3

from dropbox import DropboxOAuth2FlowNoRedirect
flow = DropboxOAuth2FlowNoRedirect("APP_KEY", use_pkce=True, token_access_type="offline")
print("Visit:", flow.start())
print("DB_REFRESH_TOKEN =", flow.finish(input("Code: ").strip()).refresh_token)
