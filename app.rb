require 'rubygems'
require 'compass' #must be loaded before sinatra
require 'sinatra'
require 'sinatra/sequel'
require 'haml'    #must be loaded after sinatra

# set sinatra's variables
set :app_file, __FILE__
set :root, File.dirname(__FILE__)
set :views, "views"
set :public, 'static'

set :product_name, 'ColorSnapper'
set :product_keywords, 'mac apple application color snapper pick HEX RGB CSS CSS3 NSColor developer designer'
set :product_mas_url, 'http://itunes.apple.com/app/colorsnapper/id418176775?mt=12'
set :company, 'Koole Sache'
set :copyright, '&copy; 2011 Koole Sache'
set :database, ENV['DATABASE_URL'] || 'sqlite://colorsnapper.db'

configure do
  Compass.add_project_configuration(File.join(Sinatra::Application.root, 'config', 'compass.config'))
end

migration "create subscriptions" do
  database.create_table :subscriptions do
    primary_key :id
    String      :email,      :null => false
    DateTime    :created_at, :null => false
  end
end

class Subscription < Sequel::Model
end

# at a minimum, the main sass file must reside within the ./views directory. here, we create a ./views/stylesheets directory where all of the sass files can safely reside.
get '/s/:name.css' do
  content_type 'text/css', :charset => 'utf-8'
  scss(:"stylesheets/#{params[:name]}", Compass.sass_engine_options )
end

get '/' do
  erb :index
end

post '/subscribe' do
  if params[:email].empty? || params[:email] !~ /^([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})$/i
    halt erb :error
  end
  @email = params[:email]
  Subscription.insert(:email => @email, :created_at => DateTime.now) unless Subscription.find(:email => @email)
  erb :success
end
