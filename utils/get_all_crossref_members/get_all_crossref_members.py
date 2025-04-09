import sys
import json
import time
import argparse
import requests


def parse_arguments():
    parser = argparse.ArgumentParser(description='Retrieve member names and IDs from Crossref API')
    parser.add_argument('-o', '--output', 
                       help='Output file path (default: members.json)',
                       default='members.json')
    
    parser.add_argument('-r', '--rows', 
                       help='Number of rows per request (default: 1000, max: 1000)',
                       type=int, 
                       default=1000)
    
    parser.add_argument('-e', '--email',
                       help='Email to include in request (to identify to the Crossref API)')
    
    parser.add_argument('--retry', 
                       help='Maximum number of retries for failed requests (default: 3)',
                       type=int,
                       default=3)
    
    parser.add_argument('--delay',
                       help='Delay between requests in seconds (default: 1)',
                       type=float,
                       default=1)
    
    return parser.parse_args()


def make_request(url, params, max_retries=3, delay=1):
    headers = {'User-Agent': 'RetrieveCrossrefMembers/1.0'}
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            print(f"Error on attempt {attempt+1}/{max_retries}: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Maximum retries reached. Exiting.")
                sys.exit(1)


def get_member_count(email=None):
    base_url = "https://api.crossref.org/members"
    params = {'rows': 0}
    if email:
        params['mailto'] = email
    data = make_request(base_url, params)
    return data['message']['total-results']


def get_members(count, rows=1000, email=None, max_retries=3, delay=1):
    base_url = "https://api.crossref.org/members"
    all_members = []
    pages = (count + rows - 1) // rows
    for offset in range(0, count, rows):
        params = {
            'rows': rows,
            'offset': offset
        }
        if email:
            params['mailto'] = email
        print(f"Fetching members {offset+1} to {min(offset+rows, count)} of {count}")
        data = make_request(base_url, params, max_retries, delay)
        members = data['message']['items']
        all_members.extend(members)
        if offset + rows < count:
            time.sleep(delay)
    
    return all_members


def process_members(members):
    return [{'id': member['id'], 'name': member['primary-name']} for member in members]


def save_to_file(data, output_path):
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved {len(data)} members to {output_path}")
    except IOError as e:
        print(f"Error saving to file: {e}")
        sys.exit(1)


def main():
    args = parse_arguments()
    print("Retrieving member count from Crossref API...")
    total_members = get_member_count(args.email)
    print(f"Found {total_members} members.")
    print("Retrieving member details...")
    members = get_members(
        total_members, 
        args.rows, 
        args.email, 
        args.retry, 
        args.delay
    )
    processed_members = process_members(members)
    save_to_file(processed_members, args.output)
    print("Done!")


if __name__ == "__main__":
    main()